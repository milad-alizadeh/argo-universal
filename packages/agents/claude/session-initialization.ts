import type { ModelInfo } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConnectInput } from '../src/agent-adapter';
import { usesSubscription } from './account';
import { applyValues } from './apply-values';
import { startingValues, type ConfigValues } from './config-options';
import type { QueryContext } from './session-resources';
export async function initialize(
  context: QueryContext,
  input: AgentConnectInput,
): Promise<InitializedSession> {
  try {
    return await initializeValues(context, input);
  } catch (error) {
    context.lifetime.detach();
    context.vendor.close();
    throw new Error(context.errors.describe(error));
  }
}
async function initializeValues(
  context: QueryContext,
  input: AgentConnectInput,
): Promise<InitializedSession> {
  const initialization = await context.vendor.initializationResult();
  if (!usesSubscription(initialization.account))
    throw new Error(
      'Sign in to Claude with a Claude subscription to start a Session.',
    );
  const models = initialization.models;
  const values = startingValues(models, input.configOptions);
  await applyValues(context.vendor, startingValues(models, []), values);
  return { models, values };
}
export interface InitializedSession {
  models: ModelInfo[];
  values: ConfigValues;
}
