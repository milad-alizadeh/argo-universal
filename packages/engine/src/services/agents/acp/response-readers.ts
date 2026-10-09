import type { AgentRequestResponsesByMethod } from '@agentclientprotocol/sdk';
import schema from '@agentclientprotocol/sdk/schema/schema.json' with { type: 'json' };
import addFormats from 'ajv-formats';
import {
  Ajv2020,
  type FormatDefinition,
  type ValidateFunction,
} from 'ajv/dist/2020.js';
import type { createRejectionCounter } from '../../../lib/count-rejections';

type RejectionReporter = Pick<
  ReturnType<typeof createRejectionCounter>,
  'report'
>;
type AcpResponses = Pick<
  AgentRequestResponsesByMethod,
  | 'initialize'
  | 'authenticate'
  | 'session/new'
  | 'session/load'
  | 'session/resume'
  | 'session/close'
  | 'session/set_mode'
  | 'session/set_config_option'
  | 'session/prompt'
>;
type ResponseReader<Response> = { parse: (value: unknown) => Response };
type AcpResponseReaders = {
  [Kind in keyof AcpResponses]: ResponseReader<AcpResponses[Kind]>;
};

const unsignedInteger = (bits: number): FormatDefinition<number> => ({
  type: 'number',
  validate: (value) =>
    Number.isInteger(value) && value >= 0 && value < 2 ** bits,
});

const uint16Bits = 16;
const uint32Bits = 32;
const uint64Bits = 64;
const validator = new Ajv2020({ strict: false });
addFormats(validator);
validator.addFormat('uint16', unsignedInteger(uint16Bits));
validator.addFormat('uint32', unsignedInteger(uint32Bits));
validator.addFormat('uint64', unsignedInteger(uint64Bits));
validator.addSchema(schema, 'acp-v1');

const rejectResponse = (
  schemaName: string,
  detail: string,
  rejections: RejectionReporter,
): never => {
  const error = new TypeError(`Invalid ACP ${schemaName}: ${detail}`);
  rejections.report(`Rejected ${schemaName}`, error);
  throw error;
};

type ResponseSchema<Response> = {
  name: keyof typeof schema.$defs;
  accepts: ValidateFunction<Response>;
};
const responseSchema = <Response>(
  name: keyof typeof schema.$defs,
): ResponseSchema<Response> => ({
  name,
  accepts: validator.compile<Response>({ $ref: `acp-v1#/$defs/${name}` }),
});
const schemas = {
  initialize: responseSchema<AcpResponses['initialize']>('InitializeResponse'),
  authenticate: responseSchema<AcpResponses['authenticate']>(
    'AuthenticateResponse',
  ),
  newSession: responseSchema<AcpResponses['session/new']>('NewSessionResponse'),
  load: responseSchema<AcpResponses['session/load']>('LoadSessionResponse'),
  resume: responseSchema<AcpResponses['session/resume']>(
    'ResumeSessionResponse',
  ),
  close: responseSchema<AcpResponses['session/close']>('CloseSessionResponse'),
  mode: responseSchema<AcpResponses['session/set_mode']>(
    'SetSessionModeResponse',
  ),
  config: responseSchema<AcpResponses['session/set_config_option']>(
    'SetSessionConfigOptionResponse',
  ),
  prompt: responseSchema<AcpResponses['session/prompt']>('PromptResponse'),
};
const responseReader = <Response>(
  { name, accepts }: ResponseSchema<Response>,
  reporter: RejectionReporter,
): ResponseReader<Response> => ({
  parse: (value: unknown): Response => {
    if (accepts(value)) return value;
    return rejectResponse(name, validator.errorsText(accepts.errors), reporter);
  },
});

export const createAcpResponseReaders = (
  reporter: RejectionReporter,
): AcpResponseReaders => ({
  initialize: responseReader(schemas.initialize, reporter),
  authenticate: responseReader(schemas.authenticate, reporter),
  'session/new': responseReader(schemas.newSession, reporter),
  'session/load': responseReader(schemas.load, reporter),
  'session/resume': responseReader(schemas.resume, reporter),
  'session/close': responseReader(schemas.close, reporter),
  'session/set_mode': responseReader(schemas.mode, reporter),
  'session/set_config_option': responseReader(schemas.config, reporter),
  'session/prompt': responseReader(schemas.prompt, reporter),
});
