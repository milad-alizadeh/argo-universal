import type {
  AgentConnectInput,
  VendorSession,
  VendorSessionListener,
} from '../src/agent-adapter';
import { changeValue, startingValues, toConfigOptions } from './config-options';
import type { VendorMessage } from './messages';
import { openAppServer } from './open-app-server';
import type { Model, ModelListResponse, TurnStartParams } from './protocol.gen';

export async function connect(
  input: AgentConnectInput,
  listener: VendorSessionListener<VendorMessage>,
): Promise<VendorSession> {
  let vendorSessionId = input.vendorSessionId;
  let activeVendorTurnId: string | null = null;
  let endedTurnId: string | null = null;
  const server = openAppServer(
    input.cwd,
    (message) => {
      const notification = message as VendorMessage;
      if (notification.params?.threadId !== vendorSessionId) return;
      if (notification.method === 'turn/started')
        activeVendorTurnId = notification.params.turn.id;
      listener.message(notification);
      if (notification.method === 'turn/completed') {
        endedTurnId = notification.params.turn.id;
        if (endedTurnId === activeVendorTurnId) activeVendorTurnId = null;
      }
    },
    listener.failed,
  );
  try {
    await server.request('initialize', {
      clientInfo: { name: 'argo', title: 'Argo', version: '0.0.0' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    server.notify('initialized');
    const { account } = await server.request('account/read', {});
    if (account?.type !== 'chatgpt')
      throw new Error('Sign in to Codex with ChatGPT to start a Session.');
    const models: Model[] = [];
    let cursor: string | null = null;
    do {
      const page: ModelListResponse = await server.request(
        'model/list',
        cursor ? { cursor } : {},
      );
      models.push(...page.data.filter((model) => !model.hidden));
      cursor = page.nextCursor;
    } while (cursor);
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
      const fullAccess = values.mode === 'fullAccess';
      const result = await server.request('turn/start', {
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
      });
      // A notification can precede the RPC response, or finish the Turn before it arrives.
      if (result.turn.status === 'inProgress' && result.turn.id !== endedTurnId)
        activeVendorTurnId = result.turn.id;
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
          case 'agent.cancel':
            if (activeVendorTurnId)
              await server.request('turn/interrupt', {
                threadId: started.thread.id,
                turnId: activeVendorTurnId,
              });
            return;
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
