import type { Options } from '@anthropic-ai/claude-agent-sdk';
import type { AgentConnectInput } from '../src/agent-adapter';
import { findExecutable } from '../src/find-executable';
import { cliEnvironment, EXECUTABLE } from './cli-environment';
import type { Requests } from './request-tracker';
import type { SessionErrors } from './session-errors';
import type { Lifetime } from './session-lifetime';
import { toolPermissions } from './tool-permissions';
type SessionOptionsInput = {
  input: AgentConnectInput;
  vendorSessionId: string;
  requests: Requests;
  lifetime: Lifetime;
  errors: SessionErrors;
};
export function sessionOptions(context: SessionOptionsInput): Options {
  const environment = cliEnvironment();
  const executable = findExecutable(EXECUTABLE, environment);
  if (!executable) throw new Error(`No ${EXECUTABLE} executable on PATH.`);
  return {
    ...queryOptions(context),
    env: environment,
    pathToClaudeCodeExecutable: executable,
  };
}
function queryOptions(context: SessionOptionsInput): Options {
  const { input, vendorSessionId, requests, lifetime, errors } = context;
  return {
    abortController: lifetime.controller,
    permissionMode: 'default',
    cwd: input.cwd,
    ...sessionIdentity(input.vendorSessionId, vendorSessionId),
    ...streamingOptions,
    canUseTool: toolPermissions(requests),
    stderr: errors.stderr,
  };
}
function sessionIdentity(
  resuming: string | null,
  vendorSessionId: string,
): Pick<Options, 'resume' | 'sessionId'> {
  return resuming ? { resume: resuming } : { sessionId: vendorSessionId };
}

const streamingOptions = {
  thinking: { type: 'adaptive', display: 'summarized' },
  allowDangerouslySkipPermissions: true,
  includePartialMessages: true,
  forwardSubagentText: true,
  perTaskStopAffordance: true,
  verbatimPrompts: true,
} satisfies Options;
