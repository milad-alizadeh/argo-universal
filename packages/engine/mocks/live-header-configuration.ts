import type { SessionConfigOption } from '@agentclientprotocol/sdk';
import { acpConfiguration } from '@repo/mocks/agent/acp-configuration';
import type { LiveHeaderHost } from './live-header-composition';
import { requireScriptedProcessAt } from './scripted-agent';

function headerConfiguration(model: string): SessionConfigOption[] {
  return acpConfiguration.map((option) =>
    option.type === 'select' && option.id === 'model'
      ? { ...option, currentValue: model }
      : option,
  );
}

export async function publishHeaderConfiguration(
  context: Pick<LiveHeaderHost, 'input'>,
  model: string,
): Promise<void> {
  const configOptions = headerConfiguration(model);
  await requireScriptedProcessAt(context.input.agent.processes).play(
    [
      {
        type: 'update',
        update: { sessionUpdate: 'config_option_update', configOptions },
      },
    ],
    'owned-1',
  );
}
