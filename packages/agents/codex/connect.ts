import type {
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import { initialize, readModels, usesChatGpt } from './handshake';
import type { VendorMessage } from './messages';
import { openAppServer } from './open-app-server';
import type { TurnStartParams } from './protocol.gen';

const createVendorTurn = () => ({
  id: null as string | null,
  identity: Promise.withResolvers<string | null>(),
  completion: Promise.withResolvers<void>(),
});

export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
  signal: AbortSignal,
): Promise<VendorSession> {
  signal.throwIfAborted();
  let vendorSessionId = input.vendorSessionId;
  let activeTurn: ReturnType<typeof createVendorTurn> | null = null;
  const server = openAppServer(
    input.cwd,
    (message) => {
      const notification = message as VendorMessage;
      if (notification.params?.threadId !== vendorSessionId) return;
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
      listener.message(notification);
      if (
        notification.method === 'turn/completed' &&
        activeTurn?.id === notification.params.turn.id
      ) {
        activeTurn.identity.resolve(null);
        activeTurn.completion.resolve();
        activeTurn = null;
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
        capabilities: { planApproval: 'startTurn', stopShell: false },
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
            const turn = activeTurn;
            if (!turn) return;
            const turnId = await turn.identity.promise;
            if (turnId && activeTurn === turn)
              await server.request('turn/interrupt', {
                threadId: started.thread.id,
                turnId,
              });
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
          // Request answers, titles, images and Shells belong to their later slices.
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
