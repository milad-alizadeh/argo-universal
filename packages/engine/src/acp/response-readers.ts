import type { AgentRequestResponsesByMethod } from '@agentclientprotocol/sdk';
import schema from '@agentclientprotocol/sdk/schema/schema.json' with { type: 'json' };
import type { createRejectionCounter } from '@repo/machine-log';
import addFormats from 'ajv-formats';
import {
  Ajv2020,
  type FormatDefinition,
  type ValidateFunction,
} from 'ajv/dist/2020.js';

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

const createUnsignedIntegerFormat = (
  bitWidth: number,
): FormatDefinition<number> => ({
  type: 'number',
  validate: (value) =>
    Number.isInteger(value) && value >= 0 && value < 2 ** bitWidth,
});

const uint16Bits = 16;
const uint32Bits = 32;
const uint64Bits = 64;
const validator = new Ajv2020({ strict: false });
addFormats(validator);
validator.addFormat('uint16', createUnsignedIntegerFormat(uint16Bits));
validator.addFormat('uint32', createUnsignedIntegerFormat(uint32Bits));
validator.addFormat('uint64', createUnsignedIntegerFormat(uint64Bits));
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
const compileAcpResponseSchema = <Response>(
  schemaName: keyof typeof schema.$defs,
): ResponseSchema<Response> => ({
  name: schemaName,
  accepts: validator.compile<Response>({ $ref: `acp-v1#/$defs/${schemaName}` }),
});
const schemas = {
  initialize:
    compileAcpResponseSchema<AcpResponses['initialize']>('InitializeResponse'),
  authenticate: compileAcpResponseSchema<AcpResponses['authenticate']>(
    'AuthenticateResponse',
  ),
  newSession:
    compileAcpResponseSchema<AcpResponses['session/new']>('NewSessionResponse'),
  load: compileAcpResponseSchema<AcpResponses['session/load']>(
    'LoadSessionResponse',
  ),
  resume: compileAcpResponseSchema<AcpResponses['session/resume']>(
    'ResumeSessionResponse',
  ),
  close: compileAcpResponseSchema<AcpResponses['session/close']>(
    'CloseSessionResponse',
  ),
  mode: compileAcpResponseSchema<AcpResponses['session/set_mode']>(
    'SetSessionModeResponse',
  ),
  config: compileAcpResponseSchema<AcpResponses['session/set_config_option']>(
    'SetSessionConfigOptionResponse',
  ),
  prompt:
    compileAcpResponseSchema<AcpResponses['session/prompt']>('PromptResponse'),
};
const createAcpResponseReader = <Response>(
  { name: schemaName, accepts }: ResponseSchema<Response>,
  rejectionReporter: RejectionReporter,
): ResponseReader<Response> => ({
  parse: (value: unknown): Response => {
    if (accepts(value)) return value;
    return rejectResponse(
      schemaName,
      validator.errorsText(accepts.errors),
      rejectionReporter,
    );
  },
});

type SessionResponseReaders = Omit<
  AcpResponseReaders,
  'initialize' | 'authenticate'
>;
const createSessionResponseReaders = (
  rejectionReporter: RejectionReporter,
): SessionResponseReaders => ({
  'session/new': createAcpResponseReader(schemas.newSession, rejectionReporter),
  'session/load': createAcpResponseReader(schemas.load, rejectionReporter),
  'session/resume': createAcpResponseReader(schemas.resume, rejectionReporter),
  'session/close': createAcpResponseReader(schemas.close, rejectionReporter),
  'session/set_mode': createAcpResponseReader(schemas.mode, rejectionReporter),
  'session/set_config_option': createAcpResponseReader(
    schemas.config,
    rejectionReporter,
  ),
  'session/prompt': createAcpResponseReader(schemas.prompt, rejectionReporter),
});
export const createAcpResponseReaders = (
  rejectionReporter: RejectionReporter,
): AcpResponseReaders => ({
  initialize: createAcpResponseReader(schemas.initialize, rejectionReporter),
  authenticate: createAcpResponseReader(
    schemas.authenticate,
    rejectionReporter,
  ),
  ...createSessionResponseReaders(rejectionReporter),
});
