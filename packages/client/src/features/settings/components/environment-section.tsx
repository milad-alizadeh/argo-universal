import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useState, type ReactElement } from 'react';
import { useTextDraft } from '../hooks/use-text-draft';
import { changeLine, environmentLine } from '../utils/environment-lines';

type Environment = Record<string, string>;

type OnLine = (current: string | undefined, text: string) => void;

export const newLinePlaceholder = 'NAME=value';

type Props = {
  id: string;
  title: string;
  footer: string;
  env: Environment;
  disabled?: boolean;
  onChange: (env: Environment) => void;
};

// Returns the actual FieldGroup.Section so the surrounding FieldGroup can place it.
export function useEnvironmentSection({
  id,
  title,
  footer,
  env,
  disabled = false,
  onChange,
}: Props): ReactElement {
  const [problem, setProblem] = useState<{ id: string; message: string }>();
  const error = problem?.id === id ? problem.message : undefined;

  const onLine: OnLine = (current, text) => {
    const change = changeLine(env, current, text);
    setProblem(change.saved ? undefined : { id, message: change.error });

    if (change.saved) onChange(change.env);
  };

  return (
    <FieldGroup.Section key={id} title={title} footer={error ?? footer}>
      {savedLines(env, onLine, disabled)}
      {newLine(env, onLine, disabled)}
    </FieldGroup.Section>
  );
}

// A line is keyed by its text, so a save resets its draft.
const savedLines = (
  env: Environment,
  onLine: OnLine,
  disabled: boolean,
): ReactElement[] =>
  Object.entries(env).map(([name, value]) => (
    <Line
      key={environmentLine(name, value)}
      name={name}
      disabled={disabled}
      text={environmentLine(name, value)}
      onSave={(text) => onLine(name, text)}
    />
  ));

// The empty last line adds a variable, and is a new field once it has.
const newLine = (
  env: Environment,
  onLine: OnLine,
  disabled: boolean,
): ReactElement => (
  <Line
    key={`new:${Object.keys(env).length}`}
    text=""
    disabled={disabled}
    onSave={(text) => onLine(undefined, text)}
  />
);

type LineProps = {
  // The variable the line shows; none for the empty last line.
  name?: string;
  text: string;
  disabled: boolean;
  onSave: (text: string) => void;
};

const lineLabel = (name?: string): string =>
  name ? `Variable ${name}` : 'New variable';

function Line({ name, text, disabled, onSave }: LineProps): ReactElement {
  return (
    <FieldGroup.TextField
      title={lineLabel(name)}
      hideTitle
      disabled={disabled}
      placeholder={newLinePlaceholder}
      {...useTextDraft(text, onSave)}
    />
  );
}
