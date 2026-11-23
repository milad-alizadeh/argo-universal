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

const secondsPerMinute = 60;

const millisecondsPerMinute = 60_000;

const dateTimeLength = 16;

const oneHour = 3_600_000;

const oneDay = 86_400_000;

function localTime(stamp: number): string {
  const offset = new Date(stamp).getTimezoneOffset() * millisecondsPerMinute;

  return new Date(stamp - offset).toISOString().slice(0, dateTimeLength);
}

function futureTime(text: string, error: string): number {
  const timestamp = new Date(text).getTime();

  if (Number.isNaN(timestamp) || timestamp <= Date.now())
    throw new Error(error);

  return timestamp;
}

interface FollowUpFields {
  text: string;
  cadence: Cadence;
  once: string;
  minutes: string;
  end: string | undefined;
}

function followUpOf({
  text,
  cadence,
  once,
  minutes,
  end,
}: FollowUpFields): Create {
  const trimmed = text.trim();

  if (!trimmed) throw new Error('Enter a Prompt');

  const prompt: Create['prompt'] = [{ type: 'text', text: trimmed }];

  if (cadence === 'once') {
    return {
      prompt,
      onceAt: futureTime(once, 'Choose a future delivery time'),
    };
  }

  const intervalSeconds = Number(minutes) * secondsPerMinute;

  if (!Number.isSafeInteger(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error('Enter a positive interval in minutes');
  }

  const endsAt =
    end === undefined ? undefined : futureTime(end, 'Choose a future end time');

  return { prompt, intervalSeconds, endsAt };
}

interface SaveFollowUp {
  error: string | undefined;
  save: (apply: () => Promise<void>) => void;
}

function useSave(close: () => void): SaveFollowUp {
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

  return { error, save: (apply): void => void save(apply) };
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

function cadenceOf(value: string): Cadence {
  return value === 'interval' ? 'interval' : 'once';
}

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
          onValueChange={(value) => setCadence(cadenceOf(value))}
        />
        <FollowUpTiming
          cadence={cadence}
          once={once}
          minutes={minutes}
          end={end ?? defaultEnd}
          onOnceChange={setOnce}
          onMinutesChange={setMinutes}
          onEndChange={setEnd}
        />
      </FieldGroup.Section>
    </DialogForm>
  );
}

interface FollowUpTimingProps {
  cadence: Cadence;
  once: string;
  minutes: string;
  end: string;
  onOnceChange: (value: string) => void;
  onMinutesChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

function FollowUpTiming(props: FollowUpTimingProps): ReactElement {
  if (props.cadence === 'once') {
    return (
      <FieldGroup.DatePicker
        title="Run at"
        mode="datetime"
        value={props.once}
        onValueChange={props.onOnceChange}
      />
    );
  }

  return (
    <>
      <FieldGroup.TextField
        title="Every (minutes)"
        value={props.minutes}
        onChangeText={props.onMinutesChange}
        keyboardType="number-pad"
      />
      <FieldGroup.DatePicker
        title="Ends at"
        mode="datetime"
        value={props.end}
        onValueChange={props.onEndChange}
      />
    </>
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

  const apply = (): Promise<void> =>
    controls.setEnd(item.id, futureTime(value, 'Choose a future end time'));

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

// Edit end sits among a Schedule's Pause and Delete buttons, so it wears theirs; Add follow-up is a card's text action.
const editEndLook = { variant: 'secondary' } as const;

const addLook = { variant: 'text', icon: 'add' } as const;

export function FollowUpEditor({
  controls,
  item,
}: {
  controls: ScheduleControls;
  item?: Schedule;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const editor = { controls, close: (): void => setOpen(false) };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        label={item ? 'Edit end' : 'Add follow-up'}
        size="xs"
        {...(item ? editEndLook : addLook)}
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
