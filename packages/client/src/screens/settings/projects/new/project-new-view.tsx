import { Button } from '@repo/kit/primitives/actions/button';
import { SegmentedControl } from '@repo/kit/primitives/controls/segmented-control';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { useForm } from '@tanstack/react-form';
import type * as React from 'react';
import { useState } from 'react';
import type { ProjectSource } from '#features/settings';
import { sourceCopy, sources } from './project-new-copy';

export interface ProjectNewViewProps {
  // The Server is adding it: the form keeps what was typed and cannot be sent twice.
  adding?: boolean;
  onSubmit: (source: ProjectSource, value: string) => void;
}

// Add a Project: a folder on the Server, a repository to clone, or a new one, then Add held at the foot of the page.
export function ProjectNewView(props: ProjectNewViewProps): React.JSX.Element {
  return (
    <Screen title="Add Project">
      <ProjectNewForm {...props} />
    </Screen>
  );
}

// Nothing typed is nothing to add.
const sentFrom =
  (source: ProjectSource, props: ProjectNewViewProps) =>
  ({ value }: { value: { value: string } }): void => {
    const typed = value.value.trim();

    if (typed) props.onSubmit(source, typed);
  };

// Another way in is another form, keyed by it, so its field starts empty: a folder path is not a repository URL.
function ProjectNewForm(props: ProjectNewViewProps): React.JSX.Element {
  const [source, setSource] = useState<ProjectSource>('folder');

  return (
    <SourceForm key={source} {...props} source={source} onChoose={setSource} />
  );
}

type SourceFormProps = ProjectNewViewProps & {
  source: ProjectSource;
  onChoose: (source: ProjectSource) => void;
};

function SourceForm(props: SourceFormProps): React.JSX.Element {
  const form = useForm({
    defaultValues: { value: '' },
    onSubmit: sentFrom(props.source, props),
  });

  return (
    <PinnedFooter footer={footerOf(props, () => void form.handleSubmit())}>
      <SourceChoice {...props} />
      <form.Field name="value">{(field) => fieldOf(props, field)}</form.Field>
    </PinnedFooter>
  );
}

const fieldOf = (
  props: SourceFormProps,
  field: { state: { value: string }; handleChange: (value: string) => void },
): React.JSX.Element => (
  <SourceField
    {...props}
    source={props.source}
    field={field.state.value}
    onChange={field.handleChange}
  />
);

const sourceOf = (value: string): ProjectSource =>
  sources.find((source) => source === value) ?? 'folder';

const sourceOptions = sources.map((value) => ({
  value,
  label: sourceCopy[value].label,
}));

function SourceChoice(props: SourceFormProps): React.JSX.Element {
  return (
    <SegmentedControl
      label="Add a Project from"
      value={props.source}
      disabled={props.adding}
      options={sourceOptions}
      onValueChange={(next) => props.onChoose(sourceOf(next))}
    />
  );
}

type FieldProps = ProjectNewViewProps & {
  source: ProjectSource;
  field: string;
  onChange: (value: string) => void;
};

function SourceField(props: FieldProps): React.JSX.Element {
  const copy = sourceCopy[props.source];

  return (
    <FieldGroup disabled={props.adding}>
      <FieldGroup.Section footer={copy.footer}>
        <FieldGroup.TextField
          title={copy.field}
          placeholder={copy.placeholder}
          value={props.field}
          onChangeText={props.onChange}
        />
      </FieldGroup.Section>
    </FieldGroup>
  );
}

const footerOf = (
  props: ProjectNewViewProps,
  submit: () => void,
): React.JSX.Element => (
  <Button
    label={props.adding ? 'Adding…' : 'Add'}
    fullWidth
    disabled={props.adding}
    onPress={submit}
  />
);
