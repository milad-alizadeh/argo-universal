import {
  DatePicker,
  Form,
  Picker,
  Stack,
  Text,
  TextInput,
  useState,
} from '@argo/plugin-kit';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
];

const empty = { title: '', labels: [], due: undefined };

// Each field echoes at once in the App; the Plugin keeps the draft and reads it on submit.
export function HelloForm() {
  const [draft, setDraft] = useState(empty);
  const [saved, setSaved] = useState('');
  const change = (field) => (value) => setDraft({ ...draft, [field]: value });

  return (
    <Stack direction="column" gap={4}>
      <Form submitLabel="Create Issue" onSubmit={() => setSaved(draft.title)}>
        <IssueFields draft={draft} change={change} />
      </Form>
      {saved ? <Text>{`Created ${saved}`}</Text> : null}
    </Stack>
  );
}

function IssueFields({ draft, change }) {
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

function LabelsPicker({ value, onValueChange }) {
  return (
    <Picker
      label="Labels"
      multiple
      options={labels}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
