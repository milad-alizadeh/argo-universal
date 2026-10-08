import path from 'node:path';
import {
  isWireFrame,
  isControlRequest,
  isControlResponse,
  type WireFrame,
  type MappedControlResponse,
} from '../../../packages/agents/claude/control-payloads.ts';
import type {
  PermissionResult,
  MappedControlRequest,
} from '../../../packages/agents/claude/messages.ts';
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

type ToolRequest = MappedControlRequest & {
  request: Extract<
    MappedControlRequest['request'],
    { subtype: 'can_use_tool' }
  >;
};

function recordedRequest(payload: unknown): ToolRequest {
  const request = recordedFrames(payload, 'output', isWireFrame).find(
    (frame): frame is ToolRequest =>
      isControlRequest(frame) && frame.request.subtype === 'can_use_tool',
  );
  if (!request) throw new Error('Recording has no request');
  return request;
}

type SuccessfulResponse = MappedControlResponse & {
  response: Extract<MappedControlResponse['response'], { subtype: 'success' }>;
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
