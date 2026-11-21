import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  Dialog,
  DialogCancel,
  DialogFooter,
  DialogForm,
} from '@repo/kit/primitives/overlays/dialog';
import { useState, type ReactElement } from 'react';
import type { ScheduleControls } from '../hooks/use-schedules';

type Schedule = ScheduleControls['items'][number];
type Create = Parameters<ScheduleControls['create']>[0];
type Cadence = 'once' | 'interval';

const cadences = [
  { value: 'once', label: 'Once' },
  { value: 'interval', label: 'Interval' },
];

const oneHour = 3_600_000;
const oneDay = 86_400_000;

function localTime(stamp: number): string {
  const offset = new Date(stamp).getTimezoneOffset() * 60_000;
  return new Date(stamp - offset).toISOString().slice(0, 16);
}

const instant = (text: string): number => new Date(text).getTime();

function followUpOf({
  text,
  cadence,
  once,
  minutes,
  end,
}: {
  text: string;
  cadence: Cadence;
  once: string;
  minutes: string;
  end: string | undefined;
}): Create {
  const trimmed = text.trim();

  if (!trimmed) throw new Error('Enter a Prompt');
  const prompt: Create['prompt'] = [{ type: 'text', text: trimmed }];

  if (cadence === 'once') {
    const onceAt = instant(once);

    if (!(onceAt > Date.now()))
      throw new Error('Choose a future delivery time');
    return { prompt, onceAt };
  }

  const intervalSeconds = Number(minutes) * 60;

  if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds <= 0)
    throw new Error('Enter a positive interval in minutes');

  const endsAt = end === undefined ? undefined : instant(end);
  if (endsAt !== undefined && !(endsAt > Date.now()))
    throw new Error('Choose a future end time');

  return { prompt, intervalSeconds, endsAt };
}

function useSave(close: () => void): {
  error: string | undefined;
  save: (apply: () => Promise<void>) => void;
} {
  const [error, setError] = useState<string>();

  async function save(apply: () => Promise<void>): Promise<void> {
    try {
      setError(undefined);
      await apply();
      close();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Could not save follow-up',
      );
    }
  }

  return { error, save: (apply) => void save(apply) };
}

function ScheduleFooter({
  error,
  label,
  disabled,
  onPress,
}: {
  error: string | undefined;
  label: string;
  disabled: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <>
      {error ? (
        <Text accessibilityRole="alert" role="secondary" tone="danger">
          {error}
        </Text>
      ) : null}
      <DialogFooter>
        <DialogCancel label="Cancel" />
        <Button label={label} disabled={disabled} onPress={onPress} />
      </DialogFooter>
    </>
  );
}

type EditorProps = { controls: ScheduleControls; close: () => void };

function CreateFollowUp({ controls, close }: EditorProps): ReactElement {
  const [text, setText] = useState('');
  const [cadence, setCadence] = useState<Cadence>('once');
  const [once, setOnce] = useState(() => localTime(Date.now() + oneHour));
  const [minutes, setMinutes] = useState('60');
  const [defaultEnd] = useState(() => localTime(Date.now() + oneDay));
  const [end, setEnd] = useState<string>();
  const { error, save } = useSave(close);
  const apply = (): Promise<void> =>
    controls.create(followUpOf({ text, cadence, once, minutes, end }));

  return (
    <DialogForm
      title="Schedule follow-up"
      size="md"
      footer={
        <ScheduleFooter
          error={error}
          label="Schedule"
          disabled={controls.disabled}
          onPress={() => save(apply)}
        />
      }
    >
      <FieldGroup.Section>
        <FieldGroup.TextField
          title="Prompt"
          value={text}
          onChangeText={setText}
          multiline
        />
        <FieldGroup.Picker
          title="Cadence"
          presentation="menu"
          options={cadences}
          value={cadence}
          onValueChange={(value) =>
            setCadence(value === 'interval' ? value : 'once')
          }
        />
        {cadence === 'once' ? (
          <FieldGroup.DatePicker
            title="Run at"
            mode="datetime"
            value={once}
            onValueChange={setOnce}
          />
        ) : (
          <FieldGroup.TextField
            title="Every (minutes)"
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
          />
        )}
        {cadence === 'interval' ? (
          <FieldGroup.DatePicker
            title="Ends at"
            mode="datetime"
            value={end ?? defaultEnd}
            onValueChange={setEnd}
          />
        ) : null}
      </FieldGroup.Section>
    </DialogForm>
  );
}

function EditEnd({
  item,
  controls,
  close,
}: EditorProps & { item: Schedule }): ReactElement {
  const [value, setValue] = useState(() =>
    localTime(item.endsAt ?? Date.now() + oneDay),
  );
  const { error, save } = useSave(close);

  function apply(): Promise<void> {
    const endsAt = instant(value);
    if (!(endsAt > Date.now())) throw new Error('Choose a future end time');
    return controls.setEnd(item.id, endsAt);
  }

  return (
    <DialogForm
      title="Edit follow-up end"
      size="md"
      footer={
        <ScheduleFooter
          error={error}
          label="Save"
          disabled={controls.disabled}
          onPress={() => save(apply)}
        />
      }
    >
      <FieldGroup.Section>
        <FieldGroup.DatePicker
          title="Ends at"
          mode="datetime"
          value={value}
          onValueChange={setValue}
        />
      </FieldGroup.Section>
    </DialogForm>
  );
}

export function FollowUpEditor({
  controls,
  item,
}: {
  controls: ScheduleControls;
  item?: Schedule;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const editor = { controls, close: () => setOpen(false) };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        label={item ? 'Edit end' : 'Add follow-up'}
        size="xs"
        variant="secondary"
        disabled={controls.disabled}
        onPress={() => setOpen(true)}
      />
      {open &&
        (item ? (
          <EditEnd {...editor} item={item} />
        ) : (
          <CreateFollowUp {...editor} />
        ))}
    </Dialog>
  );
}
