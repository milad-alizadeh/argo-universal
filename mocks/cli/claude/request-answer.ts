import path from 'node:path';
import type {
  AskUserQuestionInput,
  PermissionResult,
  SDKControlRequest,
  SDKControlResponse,
  SDKMessage,
} from '../../../packages/agents/claude/messages.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import type { RecordedRequestAnswer } from '../request-answer.ts';

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  const { payload } = readRecording(
    findRecording(path.join(import.meta.dirname, 'recordings'), name),
    'claude-cli',
  );
  const request = recordedFrames<SDKMessage | SDKControlRequest>(
    payload,
    'output',
  ).find(
    (frame): boolean =>
      frame.type === 'control_request' &&
      frame.request.subtype === 'can_use_tool',
  );
  if (
    request?.type !== 'control_request' ||
    request.request.subtype !== 'can_use_tool'
  )
    throw new Error('Recording has no request');
  const frame = recordedFrames<
    SDKMessage | SDKControlRequest | SDKControlResponse
  >(payload, 'input').find(
    (frame): boolean =>
      frame.type === 'control_response' &&
      frame.response.request_id === request.request_id,
  );
  if (
    frame?.type !== 'control_response' ||
    frame.response.subtype !== 'success' ||
    !frame.response.response
  )
    throw new Error('Recording has no matching answer');
  const response = frame.response.response as PermissionResult;
  if (request.request.tool_name === 'ExitPlanMode') {
    if (response.behavior === 'allow')
      return { type: 'plan', decision: 'approve' };
    return {
      type: 'plan',
      decision: 'keep_planning',
      feedback: response.message,
    };
  }
  if (request.request.tool_name === 'AskUserQuestion')
    return {
      type: 'elicitation',
      action: response.behavior === 'allow' ? 'accept' : 'decline',
      content:
        response.behavior === 'allow'
          ? (response.updatedInput?.answers as AskUserQuestionInput['answers'])
          : undefined,
    };
  return response.behavior === 'allow'
    ? { type: 'permission', optionId: 'allow_once' }
    : {
        type: 'permission',
        optionId: 'reject_once',
        message: response.message,
      };
}
