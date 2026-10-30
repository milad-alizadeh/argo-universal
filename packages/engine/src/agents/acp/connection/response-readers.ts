import type {
  Usage,
  StateUpdate,
  AgentRequestResponsesByMethod,
} from '@agentclientprotocol/sdk';
import schema from '@agentclientprotocol/sdk/schema/schema.json' with { type: 'json' };
import addFormats from 'ajv-formats';
import { Ajv2020, type Schema, type FormatDefinition } from 'ajv/dist/2020.js';
import { initializeResponseSchema } from './initialize-response-schema';
import {
  type CompiledSchema,
  compileSchema,
  type RejectionReporter,
  type SchemaReader,
} from './schema-reader';

type AcpResponses = Pick<
  AgentRequestResponsesByMethod,
  | 'initialize'
  | 'authenticate'
  | 'session/new'
  | 'session/resume'
  | 'session/load'
  | 'session/close'
  | 'session/set_config_option'
  | 'session/prompt'
>;

type AcpResponseReaders = {
  [Kind in keyof AcpResponses]: SchemaReader<AcpResponses[Kind]>;
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

type SchemaName = keyof typeof schema.$defs;

const compileAcpResponseSchema = <Response>(
  schemaName: SchemaName,
  responseSchema: Schema = { $ref: `acp-v1#/$defs/${schemaName}` },
): CompiledSchema<Response> =>
  compileSchema<Response>(validator, responseSchema, {
    rejected: `Rejected ${schemaName}`,
    invalid: (errors): string => `Invalid ACP ${schemaName}: ${errors}`,
  });

const schemas = {
  initialize: compileAcpResponseSchema<AcpResponses['initialize']>(
    'InitializeResponse',
    initializeResponseSchema,
  ),
  authenticate: compileAcpResponseSchema<AcpResponses['authenticate']>(
    'AuthenticateResponse',
  ),
  newSession:
    compileAcpResponseSchema<AcpResponses['session/new']>('NewSessionResponse'),
  resume: compileAcpResponseSchema<AcpResponses['session/resume']>(
    'ResumeSessionResponse',
  ),
  load: compileAcpResponseSchema<AcpResponses['session/load']>(
    'LoadSessionResponse',
  ),
  close: compileAcpResponseSchema<AcpResponses['session/close']>(
    'CloseSessionResponse',
  ),
  config: compileAcpResponseSchema<AcpResponses['session/set_config_option']>(
    'SetSessionConfigOptionResponse',
  ),
  prompt:
    compileAcpResponseSchema<AcpResponses['session/prompt']>('PromptResponse'),
};

type SessionResponseReaders = Omit<
  AcpResponseReaders,
  'initialize' | 'authenticate'
>;

const createSessionResponseReaders = (
  rejectionReporter: RejectionReporter,
): SessionResponseReaders => ({
  'session/new': schemas.newSession.reader(rejectionReporter),
  'session/resume': schemas.resume.reader(rejectionReporter),
  'session/load': schemas.load.reader(rejectionReporter),
  'session/close': schemas.close.reader(rejectionReporter),
  'session/set_config_option': schemas.config.reader(rejectionReporter),
  'session/prompt': schemas.prompt.reader(rejectionReporter),
});

export const createAcpResponseReaders = (
  rejectionReporter: RejectionReporter,
): AcpResponseReaders => ({
  initialize: schemas.initialize.reader(rejectionReporter),
  authenticate: schemas.authenticate.reader(rejectionReporter),
  ...createSessionResponseReaders(rejectionReporter),
});

const usageSchema = compileAcpResponseSchema<Usage>('Usage');

export function readAcpUsage(state: StateUpdate): Usage | undefined {
  const value = 'usage' in state ? state.usage : undefined;

  return usageSchema.accepts(value) ? value : undefined;
}
