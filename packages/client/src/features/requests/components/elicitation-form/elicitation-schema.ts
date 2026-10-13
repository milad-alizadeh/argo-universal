import type {
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { errorMessage } from './elicitation-errors';
import { numericProperty } from './elicitation-property';

type ElicitationField = {
  name: string;
  property: ElicitationPropertySchema;
  key: string;
  required: boolean;
};
type ElicitationContent = Record<string, ElicitationValue | number>;
interface ElicitationSchema {
  fields: ElicitationField[];
  error: string | undefined;
  content: (values: ElicitationFormValues) => ElicitationContent;
  defaultValues: (values: ElicitationValues) => ElicitationFormValues;
  validate: (input: {
    value: ElicitationFormValues;
  }) => { form?: string; fields: Record<string, string> } | undefined;
}
type CompiledSchema = { check?: ValidateFunction; error?: string };

export type ElicitationValue = string | boolean | string[];
export type ElicitationValues = Record<string, ElicitationValue>;
type ElicitationFormValues = Record<string, ElicitationValue | undefined>;
const validator = addFormats(new Ajv({ allErrors: true, strict: false }));

export function createElicitationSchema(
  schema: PendingElicitation['requestedSchema'],
): ElicitationSchema {
  const fields = schemaFields(schema);
  const compiled = compileSchema(schema);
  const content = contentOf(fields);
  return {
    fields,
    error: compiled.error,
    content,
    defaultValues: defaultValuesOf(fields),
    validate: validatorOf(fields, compiled, content),
  };
}

function schemaFields(
  schema: PendingElicitation['requestedSchema'],
): ElicitationField[] {
  return Object.entries(schema.properties).map(([name, property], index) => ({
    name,
    property,
    key: `property${index}`,
    required: schema.required?.includes(name) ?? false,
  }));
}

function compileSchema(
  schema: PendingElicitation['requestedSchema'],
): CompiledSchema {
  try {
    return { check: validator.compile({ type: 'object', ...schema }) };
  } catch {
    return { error: 'The Agent provided an invalid form.' };
  }
}

function contentOf(fields: ElicitationField[]): ElicitationSchema['content'] {
  return (values) =>
    Object.fromEntries(
      fields.flatMap(
        ({ name, key, property }): [string, ElicitationValue | number][] => {
          const value = contentValue(property, values[key]);
          return value === undefined ? [] : [[name, value]];
        },
      ),
    );
}

function contentValue(
  property: ElicitationPropertySchema,
  value: ElicitationValue | undefined,
): ElicitationValue | number | undefined {
  return typeof value === 'string' && numericProperty(property)
    ? numberValue(value)
    : value;
}

const numberValue = (text: string): number | undefined =>
  text.trim() ? Number(text) : undefined;

function defaultValuesOf(
  fields: ElicitationField[],
): ElicitationSchema['defaultValues'] {
  return (values) =>
    Object.fromEntries(
      fields.map(({ name, key, property }) => [
        key,
        formValue(values[name] ?? property.default ?? blankValue(property)),
      ]),
    );
}

const blankValue = (property: ElicitationPropertySchema): false | undefined =>
  property.type === 'boolean' ? false : undefined;

const formValue = (
  value: ElicitationValue | number | undefined,
): ElicitationValue | undefined =>
  typeof value === 'number' ? String(value) : value;

function validatorOf(
  fields: ElicitationField[],
  compiled: CompiledSchema,
  content: ElicitationSchema['content'],
): ElicitationSchema['validate'] {
  const check = compiled.check;
  if (!check) return () => ({ form: compiled.error, fields: {} });
  return ({ value }) =>
    check(content(value))
      ? undefined
      : { fields: fieldErrors(fields, check.errors ?? []) };
}

function fieldErrors(
  fields: ElicitationField[],
  errors: readonly ErrorObject[],
): Record<string, string> {
  const messages: Record<string, string> = {};
  for (const [field, error] of erroredFields(fields, errors))
    messages[field.key] ??= errorMessage(error, field.property);
  return messages;
}

function erroredFields(
  fields: ElicitationField[],
  errors: readonly ErrorObject[],
): [ElicitationField, ErrorObject][] {
  return errors.flatMap((error): [ElicitationField, ErrorObject][] => {
    const field = fields.find(({ name }) => name === errorProperty(error));
    return field ? [[field, error]] : [];
  });
}

function errorProperty(error: ErrorObject): string | undefined {
  return error.keyword === 'required'
    ? String(error.params.missingProperty)
    : pointerName(error.instancePath);
}

const pointerName = (path: string): string | undefined =>
  path.slice(1).split('/')[0]?.replaceAll('~1', '/').replaceAll('~0', '~');
