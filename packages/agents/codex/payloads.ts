import { Ajv, type ValidateFunction } from 'ajv';
import type { VendorMessage } from './messages';
import type { Requests } from './open-app-server';
import schemas from './protocol-schemas.gen.json' with { type: 'json' };
import type {
  ModelListResponse,
  InitializeResponse,
  ThreadResumeResponse,
  TurnStartResponse,
  TurnInterruptResponse,
  GetAccountResponse,
  ThreadStartResponse,
} from './protocol.gen';

const validator = new Ajv({ strict: false });
validator.addSchema(schemas, 'protocol');
export const isVendorMessage = validator.compile<VendorMessage>({
  $ref: 'protocol#/definitions/VendorMessage',
});
export const isModelListResponse = validator.compile<ModelListResponse>({
  $ref: 'protocol#/definitions/ModelListResponse',
});
export const isThreadStartResponse = validator.compile<ThreadStartResponse>({
  $ref: 'protocol#/definitions/ThreadStartResponse',
});

export const isAccountResponse = validator.compile<GetAccountResponse>({
  $ref: 'protocol#/definitions/GetAccountResponse',
});

export const responseValidators: {
  [Method in keyof Requests]: ValidateFunction<Requests[Method][1]>;
} = {
  initialize: validator.compile<InitializeResponse>({
    $ref: 'protocol#/definitions/InitializeResponse',
  }),
  'account/read': validator.compile<GetAccountResponse>({
    $ref: 'protocol#/definitions/GetAccountResponse',
  }),
  'model/list': validator.compile<ModelListResponse>({
    $ref: 'protocol#/definitions/ModelListResponse',
  }),
  'thread/start': validator.compile<ThreadStartResponse>({
    $ref: 'protocol#/definitions/ThreadStartResponse',
  }),
  'thread/resume': validator.compile<ThreadResumeResponse>({
    $ref: 'protocol#/definitions/ThreadResumeResponse',
  }),
  'turn/start': validator.compile<TurnStartResponse>({
    $ref: 'protocol#/definitions/TurnStartResponse',
  }),
  'turn/interrupt': validator.compile<TurnInterruptResponse>({
    $ref: 'protocol#/definitions/TurnInterruptResponse',
  }),
};
