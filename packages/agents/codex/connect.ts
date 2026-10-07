import type {
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { toQuestionAnswers } from '../src/elicitation-form';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import { initialize, readModels, usesChatGpt } from './handshake';
import type { VendorMessage } from './messages';
import { openAppServer } from './open-app-server';
import type {
  CommandExecutionRequestApprovalResponse,
  FileChangeRequestApprovalResponse,
  ToolRequestUserInputResponse,
  TurnInterruptParams,
  TurnInterruptResponse,
  TurnStartParams,
} from './protocol.gen';

interface VendorTurn {
  id: string | null;
  identity: PromiseWithResolvers<string | null>;
  completion: PromiseWithResolvers<void>;
  completed: boolean;
  interrupted?: Promise<void>;
}

const createVendorTurn = (): VendorTurn => ({
  id: null,
  identity: Promise.withResolvers<string | null>(),
  completion: Promise.withResolvers<void>(),
  completed: false,
});

export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  let vendorSessionId = input.vendorSessionId;
  let activeTurn: VendorTurn | null = null;
  const permissions = new Map<
    string,
    Extract<
      VendorMessage,
      {
        method:
          | 'item/commandExecution/requestApproval'
          | 'item/fileChange/requestApproval';
      }
    >
  >();
  let elicitation: Extract<
    VendorMessage,
    { method: 'item/tool/requestUserInput' }
  > | null = null;
  const server = openAppServer(
    input.cwd,
    (message) => {
      const notification = message as VendorMessage;
      if (notification.params?.threadId !== vendorSessionId) return;
      if (
        notification.method === 'item/commandExecution/requestApproval' ||
        notification.method === 'item/fileChange/requestApproval'
      )
        permissions.set(notification.params.itemId, notification);
      if (notification.method === 'item/tool/requestUserInput')
        elicitation = notification;
      if (notification.method === 'turn/started') {
        if (
          !activeTurn ||
          (activeTurn.id !== null &&
            activeTurn.id !== notification.params.turn.id)
        )
          activeTurn = createVendorTurn();
        activeTurn.id = notification.params.turn.id;
        activeTurn.identity.resolve(activeTurn.id);
      }
      listener.message({ ...notification, receivedAt: Date.now() });
      if (
        notification.method === 'turn/completed' &&
        activeTurn?.id === notification.params.turn.id
      ) {
        activeTurn.completed = true;
        activeTurn.identity.resolve(null);
        activeTurn.completion.resolve();
        activeTurn = null;
        permissions.clear();
        elicitation = null;
      }
    },
    listener.failed,
    signal,
  );
  try {
    if (!usesChatGpt(await initialize(server)))
      throw new Error('Sign in to Codex with ChatGPT to start a Session.');
    const models = await readModels(server);
    let values = startingValues(models, input.configOptions);
    const settings = {
      cwd: input.cwd,
      model: values.model,
      approvalPolicy: 'on-request' as const,
      sandbox: 'workspace-write' as const,
    };
    const started = input.vendorSessionId
      ? await server.request('thread/resume', {
          ...settings,
          threadId: input.vendorSessionId,
        })
      : await server.request('thread/start', settings);
    vendorSessionId = started.thread.id;
    // Both cancellation paths share one interrupt for this vendor Turn.
    const interrupt = (turn: VendorTurn) =>
      (turn.interrupted ??= (async () => {
        const turnId = await turn.identity.promise;
        if (!turnId || activeTurn !== turn) return;
        try {
          await (server.request('turn/interrupt', {
            threadId: started.thread.id,
            turnId,
          } satisfies TurnInterruptParams) satisfies Promise<TurnInterruptResponse>);
        } catch (error) {
          if (!turn.completed) throw error;
        }
      })());
    const prompt = async (content: TurnStartParams['input']) => {
      const turn = createVendorTurn();
      activeTurn = turn;
      const fullAccess = values.mode === 'fullAccess';
      try {
        const response = server
          .request('turn/start', {
            threadId: started.thread.id,
            input: content,
            model: values.model,
            effort: values.effort,
            summary: 'detailed',
            approvalPolicy: fullAccess ? 'never' : 'on-request',
            sandboxPolicy: fullAccess
              ? { type: 'dangerFullAccess' }
              : {
                  type: 'workspaceWrite',
                  writableRoots: [],
                  networkAccess: false,
                  excludeTmpdirEnvVar: false,
                  excludeSlashTmp: false,
                },
            collaborationMode: {
              mode: values.mode === 'plan' ? 'plan' : 'default',
              settings: {
                model: values.model,
                reasoning_effort: values.effort,
                developer_instructions: null,
              },
            },
          })
          .then((result) => {
            // A completed Turn's late response must not replace the next Turn's identity.
            if (activeTurn !== turn) return;
            if (result.turn.status === 'inProgress') {
              turn.id = result.turn.id;
              turn.identity.resolve(turn.id);
            } else {
              turn.completed = true;
              turn.completion.resolve();
              activeTurn = null;
            }
          });
        await Promise.race([response, turn.completion.promise]);
      } finally {
        turn.identity.resolve(null);
      }
    };
    return {
      ready: {
        vendorSessionId,
        configOptions: toConfigOptions(models, values),
        capabilities: {
          planApproval: 'startTurn',
          stopShell: false,
          permissionFeedback: false,
        },
        continuedOutside: false,
      },
      run: async (command) => {
        switch (command.type) {
          case 'agent.prompt':
            await prompt(
              command.content.flatMap((block) =>
                block.type === 'text'
                  ? [
                      {
                        type: 'text' as const,
                        text: block.text,
                        text_elements: [],
                      },
                    ]
                  : [],
              ),
            );
            return;
          case 'agent.cancel': {
            if (activeTurn) await interrupt(activeTurn);
            return;
          }
          case 'agent.setConfigOption': {
            const next = changeValue(models, values, command);
            if (!next) return;
            values = next;
            listener.event({
              type: 'agent.configOptionsChanged',
              configOptions: toConfigOptions(models, values),
            });
            return;
          }
          case 'agent.answerPermission': {
            const request = permissions.get(command.toolCallId);
            if (!request) return;
            permissions.delete(command.toolCallId);
            const result:
              | CommandExecutionRequestApprovalResponse
              | FileChangeRequestApprovalResponse = {
              decision: 'decline',
            };
            if (command.optionId === 'allow_once') result.decision = 'accept';
            if (command.optionId === null) result.decision = 'cancel';
            server.respond(request.id, result);
            return;
          }
          case 'agent.answerElicitation': {
            const request = elicitation;
            if (!request) return;
            elicitation = null;
            if (command.action === 'cancel' && request.params.isBlocking) {
              if (activeTurn?.id === request.params.turnId)
                await interrupt(activeTurn);
              return;
            }
            const answers: ToolRequestUserInputResponse = {
              answers: Object.fromEntries(
                Object.entries(
                  toQuestionAnswers(
                    command.action === 'accept' ? command.content : undefined,
                  ),
                ).map(([id, answers]) => [id, { answers }]),
              ),
            };
            server.respond(
              request.id,
              command.action === 'accept'
                ? answers
                : ({ answers: {} } satisfies ToolRequestUserInputResponse),
            );
            return;
          }
          // Plan answers, titles, images and Shells belong to their later slices.
          default:
            return;
        }
      },
      stop: server.close,
    };
  } catch (error) {
    await server.close();
    throw error;
  }
}
