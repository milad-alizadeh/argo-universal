import type {
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

interface ElicitationSchema {
  fields: {
    name: string;
    property: ElicitationPropertySchema;
    key: string;
    required: boolean;
  }[];
  error: string | undefined;
  content: (
    values: ElicitationFormValues,
  ) => Record<string, ElicitationValue | number>;
  defaultValues: (values: ElicitationValues) => ElicitationFormValues;
  validate: (input: {
    value: ElicitationFormValues;
  }) => { form?: string; fields: Record<string, string> } | undefined;
}

export type ElicitationValue = string | boolean | string[];
export type ElicitationValues = Record<string, ElicitationValue>;
export type ElicitationFormValues = Record<
  string,
  ElicitationValue | undefined
>;
const validator = addFormats(new Ajv({ allErrors: true, strict: false }));

export function elicitationChoices(
  property: ElicitationPropertySchema,
): Extract<ElicitationPropertySchema, { type: 'string' }>['oneOf'] {
  if (property.type === 'string')
    return (
      property.oneOf ??
      property.enum?.map((value) => ({ const: value, title: value }))
    );
  if (property.type === 'array')
    return 'anyOf' in property.items
      ? property.items.anyOf
      : property.items.enum.map((value) => ({ const: value, title: value }));
  return;
}

function errorMessage(
  error: ErrorObject,
  property: ElicitationPropertySchema,
): string {
  if (error.keyword === 'required') return 'This field is required.';
  if (property.type === 'number' || property.type === 'integer') {
    if (error.keyword === 'type')
      return property.type === 'integer'
        ? 'Enter a whole number.'
        : 'Enter a number.';
    if (property.minimum !== undefined && property.maximum !== undefined)
      return `Enter ${property.type === 'integer' ? 'a whole number' : 'a number'} from ${property.minimum} to ${property.maximum}.`;
    if (property.minimum !== undefined)
      return `Enter ${property.minimum} or more.`;
    if (property.maximum !== undefined)
      return `Enter ${property.maximum} or less.`;
  }
  if (error.keyword === 'format') {
    const formats: Record<string, string> = {
      email: 'Enter an email address.',
      uri: 'Enter a complete URL.',
      date: 'Enter a valid date.',
      'date-time': 'Enter a valid date and time.',
    };
    return formats[error.params.format] ?? 'Use the requested format.';
  }
  if (error.keyword === 'pattern') return 'Use the requested format.';
  if (elicitationChoices(property)) return 'Choose an available option.';
  return error.message ? `Value ${error.message}.` : 'Enter a valid value.';
}

export function createElicitationSchema(
  schema: PendingElicitation['requestedSchema'],
): ElicitationSchema {
  const fields = Object.entries(schema.properties).map(
    ([name, property], index) => ({
      name,
      property,
      key: `property${index}`,
      required: schema.required?.includes(name) ?? false,
    }),
  );
  let check: ValidateFunction | undefined;
  let schemaError: string | undefined;
  try {
    check = validator.compile({ type: 'object', ...schema });
  } catch {
    schemaError = 'The Agent provided an invalid form.';
  }
  const content = (
    values: ElicitationFormValues,
  ): ReturnType<ElicitationSchema['content']> =>
    Object.fromEntries(
      fields.flatMap(({ name, key, property }) => {
        const value = values[key];
        if (value === undefined) return [];
        const number =
          (property.type === 'number' || property.type === 'integer') &&
          typeof value === 'string';
        if (number && !value.trim()) return [];
        return [[name, number ? Number(value) : value]];
      }),
    );
  return {
    fields,
    error: schemaError,
    content,
    defaultValues: (values: ElicitationValues): ElicitationFormValues =>
      Object.fromEntries(
        fields.map(({ name, key, property }) => {
          const value =
            values[name] ??
            property.default ??
            (property.type === 'boolean' ? false : undefined);
          return [key, typeof value === 'number' ? String(value) : value];
        }),
      ),
    validate: ({ value }: { value: ElicitationFormValues }) => {
      const errors: Record<string, string> = {};
      if (!check) return { form: schemaError, fields: errors };
      if (check(content(value))) return;
      for (const error of check.errors ?? []) {
        const name =
          error.keyword === 'required'
            ? error.params.missingProperty
            : error.instancePath
                .slice(1)
                .split('/')[0]
                ?.replaceAll('~1', '/')
                .replaceAll('~0', '~');
        const field = fields.find((field) => field.name === name);
        if (field && !errors[field.key])
          errors[field.key] = errorMessage(error, field.property);
      }
      return { fields: errors };
    },
  };
}
