import type { PromptRequest, ContentBlock } from '@agentclientprotocol/sdk';
import {
  type AcpSessionOpening,
  type AcpSessionDestination,
  type AcpSessionLease,
} from '../../../agents';
import { awaitAcpOpening } from '../../../agents';
import type { SessionContext } from '../../session-context';
import {
  backgroundLaunch,
  predictionModel,
  applyPredictionModel,
} from './background-model';
import { suggestionPrompt } from './conversation';
import { PredictionOutput } from './prediction-output';

export type BackgroundRequest = {
  context: Pick<
    SessionContext,
    'agent' | 'projectId' | 'configOptions' | 'acpResponseReaders'
  > & {
    checkout: Pick<SessionContext['checkout'], 'path'>;
    input: Pick<SessionContext['input'], 'acp' | 'database'>;
  };
  conversation: string;
  controller: AbortController;
};

const destination = (
  output: PredictionOutput,
  controller: AbortController,
): AcpSessionDestination => ({
  update: output.observe,
  failed: () => controller.abort(),
  requestPermission: () => ({ outcome: { outcome: 'cancelled' } }),
  createElicitation: () => ({ action: 'cancel' }),
});

async function openBackground(
  input: BackgroundRequest,
  output: PredictionOutput,
): Promise<AcpSessionLease> {
  const { context, controller } = input;
  const launch = await backgroundLaunch(input);

  return context.input.acp.resources.open({
    launch,
    opening: opening(context.checkout.path),
    destination: destination(output, controller),
    signal: controller.signal,
  });
}

async function copyModel(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): Promise<void> {
  const model = predictionModel(input, lease);

  if (model) await applyPredictionModel(input, lease, model);
}

async function requestPrediction(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): Promise<boolean> {
  await copyModel(input, lease);
  input.controller.signal.throwIfAborted();

  const response = input.context.acpResponseReaders['session/prompt'].parse(
    await lease.agent.request<unknown>(
      'session/prompt',
      promptParams(input, lease),
      { cancellationSignal: input.controller.signal },
    ),
  );

  return response.stopReason === 'end_turn';
}

export async function generatePrediction(
  input: BackgroundRequest,
): Promise<string | null> {
  const output = new PredictionOutput(input.controller);
  const lease = await openBackground(input, output);

  const detach = cancelBackground(input.controller.signal, lease);

  try {
    return await readPrediction(input, lease, output);
  } finally {
    detach();
    await lease.close();
  }
}

function predictionContent(input: BackgroundRequest): ContentBlock[] {
  return [{ type: 'text', text: suggestionPrompt(input.conversation) }];
}

async function readPrediction(
  input: BackgroundRequest,
  lease: AcpSessionLease,
  output: PredictionOutput,
): Promise<string | null> {
  const completed = await awaitAcpOpening(
    requestPrediction(input, lease),
    input.controller.signal,
  );

  input.controller.signal.throwIfAborted();

  return completed ? output.read() : null;
}

function cancelBackground(
  signal: AbortSignal,
  lease: AcpSessionLease,
): () => void {
  const cancel = (): void => {
    void lease.agent
      .notify('session/cancel', { sessionId: lease.sessionId })
      .catch(() => {});
  };

  signal.addEventListener('abort', cancel, { once: true });

  if (signal.aborted) cancel();

  return () => signal.removeEventListener('abort', cancel);
}

/*
 * claude-agent-acp passes `_meta.claudeCode.options` to the Claude Agent SDK, so the prediction leaves no transcript in Claude's resume list.
 * Agents that do not know the key ignore `_meta`.
 */
const unsaved = { claudeCode: { options: { persistSession: false } } };

function opening(cwd: string): AcpSessionOpening {
  return {
    method: 'session/new',
    params: { cwd, mcpServers: [], _meta: unsaved },
  };
}

function promptParams(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): PromptRequest {
  return { sessionId: lease.sessionId, prompt: predictionContent(input) };
}
