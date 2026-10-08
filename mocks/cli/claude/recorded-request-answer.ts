import path from 'node:path';
import type {
  PermissionResult,
  SDKControlRequest,
  SDKControlResponse,
  SDKMessage,
} from '../../../packages/agents/claude/messages.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import {
  createRequestAnswerReader,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { readPermissionResult, toRequestAnswer } from './request-answer.ts';

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  return createRequestAnswerReader()(() => readRecordedAnswer(name));
}

function readRecordedAnswer(name: string): RecordedRequestAnswer {
  const { payload } = readRecording(
    findRecording(path.join(import.meta.dirname, 'recordings'), name),
    'claude-cli',
  );
  const request = recordedRequest(payload);
  return toRequestAnswer(
    request.request,
    recordedResponse(payload, request.request_id),
  );
}

type ToolRequest = SDKControlRequest & {
  request: Extract<SDKControlRequest['request'], { subtype: 'can_use_tool' }>;
};

function recordedRequest(payload: unknown): ToolRequest {
  const request = recordedFrames<SDKMessage | SDKControlRequest>(
    payload,
    'output',
  ).find(
    (frame): frame is ToolRequest =>
      frame.type === 'control_request' &&
      frame.request.subtype === 'can_use_tool',
  );
  if (!request) throw new Error('Recording has no request');
  return request;
}

type SuccessfulResponse = SDKControlResponse & {
  response: Extract<SDKControlResponse['response'], { subtype: 'success' }>;
};
type RecordedFrame = SDKMessage | SDKControlRequest | SDKControlResponse;

function recordedResponse(
  payload: unknown,
  requestId: string,
): PermissionResult {
  const frame = recordedFrames<RecordedFrame>(payload, 'input').find(
    (frame): frame is SuccessfulResponse => matchesResponse(frame, requestId),
  );
  if (!frame) throw new Error('Recording has no matching answer');
  return readPermissionResult(frame.response.response);
}

function matchesResponse(
  frame: RecordedFrame,
  requestId: string,
): frame is SuccessfulResponse {
  return (
    frame.type === 'control_response' &&
    frame.response.subtype === 'success' &&
    frame.response.request_id === requestId
  );
}
