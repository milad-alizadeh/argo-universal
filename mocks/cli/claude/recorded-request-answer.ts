import path from 'node:path';
import type {
  PermissionResult,
  SDKControlRequest,
} from '../../../packages/agents/claude/messages.ts';
import {
  isControlRequest,
  isControlResponse,
  type SDKControlResponse,
} from '../../../packages/agents/claude/wire.ts';
import {
  isRecordedFrame as isWireFrame,
  type RecordedFrame as WireFrame,
} from '../recording.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import {
  createRequestAnswerReader,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { readPermissionResult, toRequestAnswer } from './request-answer.ts';

export function recordedRequestAnswer(name: string): RecordedRequestAnswer {
  return createRequestAnswerReader()((): RecordedRequestAnswer =>
    readRecordedAnswer(name),
  );
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
  const request = recordedFrames(payload, 'output', isWireFrame).find(
    (frame): frame is ToolRequest =>
      isControlRequest(frame) && frame.request.subtype === 'can_use_tool',
  );
  if (!request) throw new Error('Recording has no request');
  return request;
}

type SuccessfulResponse = SDKControlResponse & {
  response: Extract<SDKControlResponse['response'], { subtype: 'success' }>;
};

function recordedResponse(
  payload: unknown,
  requestId: string,
): PermissionResult {
  const frame = recordedFrames(payload, 'input', isWireFrame).find(
    (frame): frame is SuccessfulResponse => matchesResponse(frame, requestId),
  );
  if (!frame) throw new Error('Recording has no matching answer');
  return readPermissionResult(frame.response.response);
}

function matchesResponse(
  frame: WireFrame,
  requestId: string,
): frame is SuccessfulResponse {
  return (
    isControlResponse(frame) &&
    frame.response.subtype === 'success' &&
    frame.response.request_id === requestId
  );
}
