import path from 'node:path';
import type { VendorRequest } from '../../../packages/agents/codex/messages.ts';
import {
  type WireFrame,
  isWireFrame,
} from '../../../packages/agents/codex/wire-payloads.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import {
  createRequestAnswerReader,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { toPlanProposalAnswer, toRequestAnswer } from './request-answer.ts';

type RecordedRequest = Pick<VendorRequest, 'method' | 'id'>;

export function recordedRequestAnswer(
  name: string,
  recordingsDirectory = path.join(import.meta.dirname, 'recordings'),
): RecordedRequestAnswer {
  return createRequestAnswerReader()((): RecordedRequestAnswer =>
    readRecordedAnswer(name, recordingsDirectory),
  );
}

function readRecordedAnswer(
  name: string,
  recordingsDirectory: string,
): RecordedRequestAnswer {
  const { payload } = readRecording(
    findRecording(recordingsDirectory, name),
    'codex-app-server',
  );
  const request = recordedFrames(payload, 'messages', isWireFrame).find(
    isRequest,
  );
  return recordedAnswer(request, payload);
}

function recordedAnswer(
  request: RecordedRequest | undefined,
  payload: unknown,
): RecordedRequestAnswer {
  const inputs = recordedFrames(payload, 'input', isWireFrame);
  if (!request) return recordedPlanAnswer(inputs);
  const response = inputs.find(
    (frame): boolean =>
      frame.id === request.id || frame.method === 'turn/interrupt',
  );
  if (!response) throw new Error('Recording has no matching answer');
  return toRequestAnswer(request, responseResult(response));
}

function responseResult(response: WireFrame): unknown {
  return response.method === 'turn/interrupt' ? response : response.result;
}

function isRequest(frame: WireFrame): frame is RecordedRequest {
  return (
    frame.id !== undefined &&
    (frame.method === 'item/commandExecution/requestApproval' ||
      frame.method === 'item/fileChange/requestApproval' ||
      frame.method === 'item/tool/requestUserInput')
  );
}

function recordedPlanAnswer(inputs: WireFrame[]): RecordedRequestAnswer {
  const nextTurn = inputs.filter(isTurnStart)[1];
  if (!nextTurn) throw new Error('Recording has no Plan answer Turn');
  return toPlanProposalAnswer(nextTurn.params);
}

function isTurnStart(
  frame: WireFrame,
): frame is WireFrame & { method: 'turn/start' } {
  return frame.method === 'turn/start';
}
