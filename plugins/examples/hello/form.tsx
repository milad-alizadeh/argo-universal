import {
  Button,
  FieldGroup,
  Screen,
  Stack,
  Text,
  useState,
} from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
];

type Draft = {
  title: string;
  labels: readonly string[];
  due: string | undefined;
};

type Change = <Field extends keyof Draft>(
  field: Field,
) => (value: Draft[Field]) => void;

const empty: Draft = { title: '', labels: [], due: undefined };

// Each field echoes at once in the App; the Plugin keeps the draft and reads it on submit.
export function HelloForm(): JSX.Element {
  const [draft, setDraft] = useState(empty);
  const [saved, setSaved] = useState('');

  const change: Change = (field) => (value) =>
    setDraft({ ...draft, [field]: value });

  const onSubmit = (): void => setSaved(draft.title);

  return (
    <Screen title="New Issue">
      <IssueFields draft={draft} change={change} />
      <SubmitIssue saved={saved} onSubmit={onSubmit} />
    </Screen>
  );
}

function SubmitIssue(props: {
  saved: string;
  onSubmit: () => void;
}): JSX.Element {
  return (
    <Stack direction="column" gap={2}>
      <Button label="Create Issue" onPress={props.onSubmit} />
      {props.saved ? <Text>{`Created ${props.saved}`}</Text> : null}
    </Stack>
  );
}

// A FieldGroup fills and scrolls the page itself, so it is the Screen's content; the submit Button sits below it, outside any section (ADR-0042).
function IssueFields(props: { draft: Draft; change: Change }): JSX.Element {
  return (
    <FieldGroup>
      <FieldGroup.Section>
        <IssueRows {...props} />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

function IssueRows(props: { draft: Draft; change: Change }): JSX.Element {
  const { draft, change } = props;

  return (
    <>
      <FieldGroup.TextField
        title="Title"
        value={draft.title}
        onChangeText={change('title')}
      />
      <LabelsPicker value={draft.labels} onValueChange={change('labels')} />
      <DueDate value={draft.due} onValueChange={change('due')} />
    </>
  );
}

function DueDate(props: {
  value: string | undefined;
  onValueChange: (value: string) => void;
}): JSX.Element {
  return (
    <FieldGroup.DatePicker
      title="Due"
      value={props.value}
      onValueChange={props.onValueChange}
    />
  );
}

function LabelsPicker(props: {
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}): JSX.Element {
  // A multiple picker reports its whole list.
  const change = (value: string | readonly string[]): void =>
    props.onValueChange(typeof value === 'string' ? [value] : value);

  return <LabelChoices value={props.value} onValueChange={change} />;
}

function LabelChoices(props: {
  value: readonly string[];
  onValueChange: (value: string | readonly string[]) => void;
}): JSX.Element {
  return (
    <FieldGroup.Picker
      title="Labels"
      presentation="menu"
      multiple
      options={labels}
      value={props.value}
      onValueChange={props.onValueChange}
    />
  );
}
