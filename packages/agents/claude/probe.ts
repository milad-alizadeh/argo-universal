import { homedir } from 'node:os';
import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { AgentProbe } from '../src/agent-adapter';
import { describeError } from '../src/describe-error';
import { findExecutable } from '../src/find-executable';
import { startingValues, toConfigOptions } from './config-options';
import { cliEnvironment, EXECUTABLE } from './connect';

const SIGN_IN_FAILURE = /sign(?:ed)? ?in|log ?in|auth/i;

export async function probe(signal: AbortSignal): Promise<AgentProbe> {
  const environment = cliEnvironment();
  const executable = findExecutable(EXECUTABLE, environment);
  if (!executable)
    return {
      availability: 'not_installed',
      installStep:
        'Install Claude Code: npm install -g @anthropic-ai/claude-code',
      configOptions: [],
    };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener('abort', abort, { once: true });
  // The CLI starts on a prompt stream that sends nothing and ends with the probe.
  const finished = Promise.withResolvers<void>();
  const prompts: AsyncIterable<SDKUserMessage> = {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        await finished.promise;
        return { done: true, value: undefined };
      },
    }),
  };
  const vendor = query({
    prompt: prompts,
    options: {
      abortController: controller,
      cwd: homedir(),
      env: environment,
      pathToClaudeCodeExecutable: executable,
    },
  });
  try {
    const { models } = await vendor.initializationResult();
    return {
      availability: 'available',
      configOptions: toConfigOptions(models, startingValues(models, [])),
    };
  } catch (error) {
    const reason = describeError(error);
    return SIGN_IN_FAILURE.test(reason)
      ? {
          availability: 'not_signed_in',
          installStep: 'Run claude in a terminal and sign in with /login',
          configOptions: [],
        }
      : {
          availability: 'unavailable',
          installStep: `Claude did not start: ${reason}`,
          configOptions: [],
        };
  } finally {
    signal.removeEventListener('abort', abort);
    finished.resolve();
    vendor.close();
  }
}
