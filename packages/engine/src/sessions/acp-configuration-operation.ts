import type { SessionConfigOption } from '@repo/contracts';
import type { AcpSessionLease } from '../agents';
import { readAcpConfiguration } from './acp/acp-configuration';
import { validateConfigChoice } from './session-admission';
import type { SessionContext } from './session-context';

type ApplyingConfig = NonNullable<SessionContext['applyingConfig']>;

type ConfigurationParameters = {
  sessionId: string;
  configId: string;
  value: string | boolean;
  type?: 'boolean';
};

const configurationParameters = (
  acpLease: AcpSessionLease,
  { configId, value }: ApplyingConfig,
): ConfigurationParameters => ({
  sessionId: acpLease.sessionId,
  configId,
  value,
  ...(typeof value === 'boolean' && { type: 'boolean' }),
});

type ConfigurationResponse = { response: unknown };

const parsedOptions = (
  context: SessionContext,
  { response }: ConfigurationResponse,
): SessionConfigOption[] => {
  const options =
    context.acpResponseReaders['session/set_config_option'].parse(
      response,
    ).configOptions;

  return readAcpConfiguration(options, context.acpConfigurationRejections);
};

async function configureChoice(
  context: SessionContext,
  acpLease: AcpSessionLease,
  choice: ApplyingConfig,
): Promise<SessionConfigOption[]> {
  const response = await acpLease.agent.request<unknown>(
    'session/set_config_option',
    configurationParameters(acpLease, choice),
  );

  return parsedOptions(context, { response });
}

export const configureAcp = async (
  context: SessionContext,
): Promise<SessionConfigOption[]> => {
  const { acpLease, applyingConfig } = context;

  if (!acpLease || !applyingConfig)
    throw new Error('No Session configuration operation');
  validateConfigChoice(context.configOptions, applyingConfig);

  return configureChoice(context, acpLease, applyingConfig);
};
