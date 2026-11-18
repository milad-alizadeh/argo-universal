import type { ElicitationEntry } from './elicitation-form-body';
import { elicitationChoices } from './elicitation-property';

// Companion Other fields belong to their choice, even when listed first.
export function elicitationPages(
  fields: ElicitationEntry[],
): ElicitationEntry[][] {
  const choices = fields.filter((entry) => elicitationChoices(entry.property));

  const owners = new Map(
    fields.map((field) => [field.key, companionOwner(field, choices)]),
  );

  return fields.flatMap((field) =>
    owners.get(field.key)
      ? []
      : [[field, ...fields.filter((entry) => owners.get(entry.key) === field)]],
  );
}

function companionOwner(
  field: ElicitationEntry,
  choices: ElicitationEntry[],
): ElicitationEntry | undefined {
  if (!textField(field)) return;

  return (
    choices.find((entry) => namedCompanion(entry.name, field.name)) ??
    unqualifiedOwner(field, choices)
  );
}

const textField = (field: ElicitationEntry): boolean =>
  field.property.type === 'string' && !elicitationChoices(field.property);

const suffixes = [
  '_other',
  '__other',
  '.other',
  '-other',
  ' (other)',
  '_note',
  '_notes',
];

const namedCompanion = (name: string, companion: string): boolean =>
  suffixes.some((suffix) => companion === `${name}${suffix}`);

function unqualifiedOwner(
  field: ElicitationEntry,
  choices: ElicitationEntry[],
): ElicitationEntry | undefined {
  if (choices.length !== 1) return;

  return isOther(field) ? choices[0] : undefined;
}

const isOther = (field: ElicitationEntry): boolean =>
  /^(other|notes?)$/i.test(field.property.title ?? field.name);
