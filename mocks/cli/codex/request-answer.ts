import path from 'node:path';
import type { VendorMessage } from '../../../packages/agents/codex/messages.ts';
import type {
  CommandExecutionRequestApprovalResponse,
  FileChangeRequestApprovalResponse,
  ToolRequestUserInputResponse,
  TurnStartParams,
} from '../../../packages/agents/codex/protocol.gen.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  const { payload } = readRecording(
    findRecording(path.join(import.meta.dirname, 'recordings'), name),
    'codex-app-server',
  );
  const request = recordedFrames<VendorMessage>(payload, 'messages').find(
    (frame) =>
      frame.method === 'item/commandExecution/requestApproval' ||
      frame.method === 'item/fileChange/requestApproval' ||
      frame.method === 'item/tool/requestUserInput',
  );
  if (!request) {
    const nextTurn = recordedFrames<{
      method: string;
      params: TurnStartParams;
    }>(payload, 'input').filter((frame) => frame.method === 'turn/start')[1];
    if (!nextTurn) throw new Error('Recording has no Plan answer Turn');
    return nextTurn.params.collaborationMode?.mode === 'default'
      ? { type: 'plan', decision: 'approve' }
      : {
          type: 'plan',
          decision: 'keep_planning',
          feedback: nextTurn.params.input
            .map((block) => (block.type === 'text' ? block.text : ''))
            .join('\n'),
        };
  }
  if (!('id' in request)) throw new Error('Recording request has no id');
  const response = recordedFrames<{ id: string | number; result: unknown }>(
    payload,
    'input',
  ).find((frame) => frame.id === request.id);
  if (!response) throw new Error('Recording has no matching answer');
  if (request.method === 'item/tool/requestUserInput') {
    const result = response.result as ToolRequestUserInputResponse;
    return {
      type: 'elicitation',
      action: 'accept',
      content: Object.fromEntries(
        Object.entries(result.answers).map(([id, answer]) => {
          const value = answer?.answers[0];
          if (value === undefined)
            throw new Error('Recording has no Elicitation answer');
          return [id, value];
        }),
      ),
    };
  }
  const result = response.result as
    | CommandExecutionRequestApprovalResponse
    | FileChangeRequestApprovalResponse;
  if (result.decision === 'accept')
    return { type: 'permission', optionId: 'allow_once' };
  if (result.decision === 'decline' || result.decision === 'cancel')
    return { type: 'permission', optionId: 'reject_once' };
  throw new Error('Recording has an unsupported Permission answer');
}
