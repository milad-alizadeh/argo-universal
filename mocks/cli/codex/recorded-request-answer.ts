import path from 'node:path';
import type {
  VendorMessage,
  VendorRequest,
} from '../../../packages/agents/codex/messages.ts';
import { findRecording, readRecording, recordedFrames } from '../recording.ts';
import {
  createRequestAnswerReader,
  type RecordedRequestAnswer,
} from '../request-answer.ts';
import { toPlanProposalAnswer, toRequestAnswer } from './request-answer.ts';

type RecordedInput = {
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
};

export function recordedRequestAnswer(
  name: string,
  recordingsDirectory = path.join(import.meta.dirname, 'recordings'),
): RecordedRequestAnswer {
  return createRequestAnswerReader()(() =>
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
  const request = recordedFrames<VendorMessage>(payload, 'messages').find(
    isRequest,
  );
  return recordedAnswer(request, payload);
}

function recordedAnswer(
  request: VendorRequest | undefined,
  payload: unknown,
): RecordedRequestAnswer {
  const inputs = recordedFrames<RecordedInput>(payload, 'input');
  if (!request) return recordedPlanAnswer(inputs);
  const response = inputs.find(
    (frame): boolean =>
      frame.id === request.id || frame.method === 'turn/interrupt',
  );
  if (!response) throw new Error('Recording has no matching answer');
  return toRequestAnswer(request, responseResult(response));
}

function responseResult(response: RecordedInput): unknown {
  return response.method === 'turn/interrupt' ? response : response.result;
}

function isRequest(frame: VendorMessage): frame is VendorRequest {
  return (
    frame.method === 'item/commandExecution/requestApproval' ||
    frame.method === 'item/fileChange/requestApproval' ||
    frame.method === 'item/tool/requestUserInput'
  );
}

function recordedPlanAnswer(inputs: RecordedInput[]): RecordedRequestAnswer {
  const nextTurn = inputs.filter(isTurnStart)[1];
  if (!nextTurn) throw new Error('Recording has no Plan answer Turn');
  return toPlanProposalAnswer(nextTurn.params);
}

function isTurnStart(
  frame: RecordedInput,
): frame is RecordedInput & { method: 'turn/start' } {
  return frame.method === 'turn/start';
}
