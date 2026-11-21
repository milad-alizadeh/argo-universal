import { RunSettingsUpdate, type RunSettingsList } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { useState, type ReactElement } from 'react';
import { useEnvironmentSection, useTextDraft } from '#features/settings';

export type RunSettingsChange = Pick<
  RunSettingsUpdate,
  'env' | 'port' | 'autoStart'
>;

export interface ProjectRunSettingsControls {
  entries: RunSettingsList;
  pending?: boolean;
  onSave: (name: string, change: RunSettingsChange) => void;
}

const portMessage = 'Enter a port from 1 to 65535, or clear the field.';

const trustMessage =
  'Start this Run Configuration yourself before turning on auto-start.';

const envMessage =
  'These variables override .argo/run.json for this Project. Clear a line to remove its override.';

const savePort = (
  text: string,
  save: (change: RunSettingsChange) => void,
): boolean => {
  const value = text.trim();

  const parsed = RunSettingsUpdate.shape.port.safeParse(
    value === '' ? null : Number(value),
  );

  if (!parsed.success || (value !== '' && !/^\d+$/u.test(value))) return false;

  save({ port: parsed.data });

  return true;
};

export function useRunSettingsSections(
  controls: ProjectRunSettingsControls | undefined,
): ReactElement | null {
  const [name, setName] = useState<string>();
  const entries = controls?.entries ?? [];

  const entry =
    entries.find((candidate) => candidate.name === name) ?? entries[0];

  const save = (change: RunSettingsChange): void => {
    if (entry) controls?.onSave(entry.name, change);
  };

  const environment = useEnvironmentSection({
    id: entry?.name ?? '',
    title: 'Environment overrides',
    footer: envMessage,
    env: entry?.env ?? {},
    disabled: controls?.pending,
    onChange: (env) => save({ env }),
  });

  const options = useRunOptions({
    entry,
    choices: entries,
    pending: controls?.pending ?? false,
    onChoose: setName,
    onSave: save,
  });

  return entry ? (
    <>
      {options}
      {environment}
    </>
  ) : null;
}

type Options = {
  entry: RunSettingsList[number] | undefined;
  choices: RunSettingsList;
  pending: boolean;
  onChoose: (name: string) => void;
  onSave: (change: RunSettingsChange) => void;
};

function useRunOptions({
  entry,
  choices,
  pending,
  onChoose,
  onSave,
}: Options): ReactElement | null {
  const [invalidPortFor, setInvalidPortFor] = useState<string>();

  if (!entry) return null;

  const invalidPort = invalidPortFor === entry.name;
  const trust = entry.canAutoStart ? undefined : trustMessage;
  const footer = invalidPort ? portMessage : trust;

  return (
    <FieldGroup.Section
      key={`options:${entry.name}`}
      title="Runs"
      footer={footer}
    >
      <FieldGroup.Picker
        title="Run Configuration"
        presentation="menu"
        value={entry.name}
        options={choices.map(({ name }) => ({ value: name, label: name }))}
        onValueChange={onChoose}
      />
      <PinnedPort
        key={entry.port}
        port={entry.port}
        invalid={invalidPort}
        disabled={pending}
        onSave={(text) =>
          setInvalidPortFor(savePort(text, onSave) ? undefined : entry.name)
        }
      />
      <FieldGroup.Toggle
        title="Auto-start when a Session opens"
        disabled={pending || !entry.canAutoStart}
        value={entry.autoStart}
        onValueChange={(autoStart) => onSave({ autoStart })}
      />
    </FieldGroup.Section>
  );
}

function PinnedPort({
  port,
  invalid,
  disabled,
  onSave,
}: {
  port: number | null;
  invalid: boolean;
  disabled: boolean;
  onSave: (text: string) => void;
}): ReactElement {
  const draft = useTextDraft(port?.toString() ?? '', onSave);

  return (
    <FieldGroup.TextField
      title="Pinned port"
      placeholder="Use configuration port"
      keyboardType="number-pad"
      error={invalid ? portMessage : undefined}
      disabled={disabled}
      {...draft}
    />
  );
}
