import type { ParamsParser } from '@agentclientprotocol/sdk';
import type { createRejectionCounter } from '@repo/machine-log';
import type { Schema, ValidateFunction } from 'ajv';
import type Ajv from 'ajv/dist/core.js';

export type RejectionReporter = Pick<
  ReturnType<typeof createRejectionCounter>,
  'report'
>;

// The SDK's object-form parser, which takes the raw JSON value.
export type SchemaReader<Value> = Exclude<
  ParamsParser<Value>,
  (params: never) => Value
>;

// What a rejection logs, and the thrown message built from Ajv's error text.
type RejectionText = {
  rejected: string;
  invalid: (errors: string) => string;
};

export type CompiledSchema<Value> = {
  accepts: ValidateFunction<Value>;
  reader(rejections: RejectionReporter): SchemaReader<Value>;
};

const rejectValue = (
  errors: string,
  text: RejectionText,
  rejections: RejectionReporter,
): never => {
  const error = new TypeError(text.invalid(errors));
  rejections.report(text.rejected, error);
  throw error;
};

const createReader =
  <Value>(
    validator: Ajv,
    accepts: ValidateFunction<Value>,
    text: RejectionText,
  ) =>
  (rejections: RejectionReporter): SchemaReader<Value> => ({
    parse: (value): Value =>
      accepts(value)
        ? value
        : rejectValue(validator.errorsText(accepts.errors), text, rejections),
  });

// Compiles `schema` with the caller's configured Ajv (Ajv or Ajv2020); its reader returns an accepted value, or reports the rejection once and throws.
export const compileSchema = <Value>(
  validator: Ajv,
  schema: Schema,
  text: RejectionText,
): CompiledSchema<Value> => {
  const accepts = validator.compile<Value>(schema);

  return { accepts, reader: createReader(validator, accepts, text) };
};
