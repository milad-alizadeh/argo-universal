import {
  type ReactFormExtendedApi,
  useForm,
  useStore,
} from '@tanstack/react-form';
import type { ReactElement } from 'react';
import { DatePicker } from '#primitives/inputs/date-picker';
import { Picker } from '#primitives/inputs/picker';
import { Textarea } from '#primitives/inputs/textarea';
import { List, ListSection } from '#primitives/lists/list';
import { ListItem } from '#primitives/lists/list-item';
import { Form } from './form';
import type { FormProps } from './form-props';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'docs', label: 'Docs' },
  { value: 'chore', label: 'Chore' },
] as const;

export type IssueDraft = {
  title: string;
  description: string;
  due?: string;
  labels?: string[];
};

type ExampleProps = Pick<FormProps, 'loading' | 'onCancel'> & {
  initial?: IssueDraft;
  titleError?: string;
  onSubmit: (draft: IssueDraft) => void;
};

const empty: IssueDraft = { title: '', description: '' };

type Draft = {
  draft: IssueDraft;
  change: { [Key in keyof IssueDraft]-?: (value: IssueDraft[Key]) => void };
  submit: () => void;
};

type DraftFields = Omit<Draft, 'submit'> & { titleError?: string };

// ADR-0033: field state lives in TanStack Form.
const useIssueForm = (props: ExampleProps): IssueFormApi =>
  useForm({
    defaultValues: props.initial ?? empty,
    onSubmit: ({ value }) => props.onSubmit(value),
  });

// No validators: the example has no rules of its own.
type IssueFormApi = ReactFormExtendedApi<
  IssueDraft,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  undefined,
  unknown
>;

function useDraft(props: ExampleProps): Draft {
  const form = useIssueForm(props);

  return {
    draft: useStore(form.store, (state) => state.values),
    change: setters(form),
    submit: () => void form.handleSubmit(),
  };
}

const setters = (form: IssueFormApi): Draft['change'] => ({
  title: (value) => form.setFieldValue('title', value),
  description: (value) => form.setFieldValue('description', value),
  due: (value) => form.setFieldValue('due', value),
  labels: (value) => form.setFieldValue('labels', value),
});

// Paper's "New issue" Form: a title, a description, a due date and labels.
export function IssueForm(props: ExampleProps): ReactElement {
  const { submit, ...fields } = useDraft(props);

  return (
    <Form
      submitLabel="Create"
      loading={props.loading}
      onCancel={props.onCancel}
      onSubmit={submit}
    >
      <IssueFields {...fields} titleError={props.titleError} />
    </Form>
  );
}

function IssueFields(props: DraftFields): ReactElement {
  return (
    <List appearance="grouped" fit>
      <TitleSection {...props} />
      <DescriptionSection {...props} />
      <DateSection {...props} />
      <LabelsSection {...props} />
    </List>
  );
}

function TitleSection(props: DraftFields): ReactElement {
  return (
    <ListSection>
      <ListItem.TextField
        label="Title"
        placeholder="Required"
        required
        value={props.draft.title}
        errors={props.titleError ? [{ message: props.titleError }] : []}
        onChangeText={(title) => props.change.title(title)}
      />
    </ListSection>
  );
}

function DescriptionSection(props: DraftFields): ReactElement {
  return (
    <ListSection title="Description" footer="Markdown is supported.">
      <Textarea
        accessibilityLabel="Description"
        placeholder="Optional"
        value={props.draft.description}
        onChangeText={(description) => props.change.description(description)}
      />
    </ListSection>
  );
}

function DateSection(props: DraftFields): ReactElement {
  return (
    <ListSection>
      <DatePicker
        label="Due date"
        value={props.draft.due}
        onValueChange={(due) => props.change.due(due)}
      />
    </ListSection>
  );
}

function LabelsSection(props: DraftFields): ReactElement {
  return (
    <ListSection>
      <Picker
        multiple
        variant="row"
        label="Labels"
        placeholder="Choose labels"
        options={labels}
        value={props.draft.labels}
        onValueChange={(next) => props.change.labels(next)}
      />
    </ListSection>
  );
}
