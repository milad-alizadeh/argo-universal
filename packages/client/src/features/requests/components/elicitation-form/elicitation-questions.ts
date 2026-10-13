import type {
  ElicitationEnumOption,
  ElicitationPropertySchema,
  PendingElicitation,
} from '@repo/contracts';
import { elicitationChoices } from './elicitation-schema';

export type ElicitationQuestion = {
  name: string;
  title: string;
  multiple: boolean;
  options: ElicitationEnumOption[];
};

export function elicitationQuestions(
  request: PendingElicitation,
): ElicitationQuestion[] | undefined {
  const fields = Object.entries(request.requestedSchema.properties);
  if (!fields.length || !fields.every(([, field]) => questionProperty(field)))
    return;
  return fields.map(([name, field]) => ({
    name,
    title: field.description ?? field.title ?? name,
    multiple: field.type === 'array',
    options: elicitationChoices(field) ?? [],
  }));
}

const questionAttributes = new Set([
  'type',
  'title',
  'description',
  'oneOf',
  'items',
]);
function questionProperty(field: ElicitationPropertySchema): boolean {
  return (
    !!field.description &&
    unconstrainedQuestion(field) &&
    questionChoicesField(field)
  );
}
function unconstrainedQuestion(field: ElicitationPropertySchema): boolean {
  return Object.keys(field).every((attribute) =>
    questionAttributes.has(attribute),
  );
}
function questionChoicesField(field: ElicitationPropertySchema): boolean {
  if (field.type === 'string') return field.oneOf !== undefined;
  if (field.type === 'array') return 'anyOf' in field.items;
  return false;
}
