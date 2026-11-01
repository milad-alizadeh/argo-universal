import type {
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import { errorMessage } from './elicitation-errors';
import { numericProperty } from './elicitation-property';
import {
  elicitationValidator,
  type ElicitationIssue,
  type ElicitationValidator,
} from './elicitation-validate';

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

export type ElicitationValue = string | boolean | string[];

export type ElicitationValues = Record<string, ElicitationValue>;

type ElicitationFormValues = Record<string, ElicitationValue | undefined>;

export function createElicitationSchema(
  schema: PendingElicitation['requestedSchema'],
): ElicitationSchema {
  const fields = schemaFields(schema);
  const checked = elicitationValidator(schema);
  const content = contentOf(fields);

  return {
    fields,
    error: checked.error,
    content,
    defaultValues: defaultValuesOf(fields),
    validate: validatorOf(fields, checked, content),
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
  checked: ElicitationValidator,
  content: ElicitationSchema['content'],
): ElicitationSchema['validate'] {
  const validate = checked.validate;

  if (!validate) return () => ({ form: checked.error, fields: {} });

  return ({ value }) => {
    const answers = content(value);

    return (
      requireAnAnswer(fields, answers) ?? formErrors(fields, validate(answers))
    );
  };
}

const noAnswer = 'Answer at least one to submit.';

const hasAnswer = (value: ElicitationValue | number): boolean =>
  typeof value === 'string'
    ? value.trim() !== ''
    : !Array.isArray(value) || value.length > 0;

// A form that asks for nothing in particular still needs something said, or there is nothing to send.
function requireAnAnswer(
  fields: ElicitationField[],
  answers: ElicitationContent,
): { form: string; fields: Record<string, string> } | undefined {
  const allOptional =
    fields.length > 0 && fields.every(({ required }) => !required);

  return allOptional && !Object.values(answers).some(hasAnswer)
    ? { form: noAnswer, fields: {} }
    : undefined;
}

const formErrors = (
  fields: ElicitationField[],
  issues: ElicitationIssue[],
): { fields: Record<string, string> } | undefined =>
  issues.length === 0 ? undefined : { fields: fieldErrors(fields, issues) };

// A field shows its first issue: later entries win, so the issues go in last to first.
function fieldErrors(
  fields: ElicitationField[],
  issues: readonly ElicitationIssue[],
): Record<string, string> {
  return Object.fromEntries(
    erroredFields(fields, issues)
      .reverse()
      .map(([field, issue]) => [
        field.key,
        errorMessage(issue, field.property),
      ]),
  );
}

function erroredFields(
  fields: ElicitationField[],
  issues: readonly ElicitationIssue[],
): [ElicitationField, ElicitationIssue][] {
  return issues.flatMap((issue): [ElicitationField, ElicitationIssue][] => {
    const field = fields.find(({ name }) => name === issue.property);

    return field ? [[field, issue]] : [];
  });
}
