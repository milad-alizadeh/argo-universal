import {
  Button,
  DatePicker,
  Picker,
  Stack,
  Text,
  TextInput,
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

  return (
    <Stack direction="column" gap={4}>
      <IssueFields draft={draft} change={change} />
      <Button label="Create Issue" onPress={() => setSaved(draft.title)} />
      {saved ? <Text>{`Created ${saved}`}</Text> : null}
    </Stack>
  );
}

function IssueFields(props: { draft: Draft; change: Change }): JSX.Element {
  const { draft, change } = props;

  return (
    <>
      <TextInput
        label="Title"
        value={draft.title}
        onChangeText={change('title')}
      />
      <LabelsPicker value={draft.labels} onValueChange={change('labels')} />
      <DatePicker label="Due" value={draft.due} onValueChange={change('due')} />
    </>
  );
}

function LabelsPicker(props: {
  value: readonly string[];
  onValueChange: (value: readonly string[]) => void;
}): JSX.Element {
  return (
    <Picker
      label="Labels"
      multiple
      options={labels}
      value={props.value}
      onValueChange={props.onValueChange}
    />
  );
}
