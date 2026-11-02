import { Button } from '@repo/kit/primitives/actions/button';
import { EntryFormActions } from '@repo/kit/primitives/scaffolds/entry-form';
import type * as React from 'react';
import { sourceCopy } from './project-new-copy';
import type { SourceFormProps } from './project-new-view';

type ActionsProps = SourceFormProps & {
  disabled?: boolean;
  value: string;
  submit: () => void;
};

export function ProjectSourceActions(props: ActionsProps): React.JSX.Element {
  return (
    <EntryFormActions>
      {cancelButton(props)}
      {submitButton(props)}
    </EntryFormActions>
  );
}

const cancelButton = (props: ActionsProps): React.JSX.Element | null =>
  props.onCancel ? (
    <Button
      label="Cancel"
      variant="text"
      disabled={props.disabled}
      onPress={props.onCancel}
    />
  ) : null;

function submitButton(props: ActionsProps): React.JSX.Element {
  const copy = sourceCopy[props.source];

  return (
    <Button
      label={props.adding ? copy.pending : copy.action}
      loading={props.adding}
      disabled={props.disabled || !props.value.trim()}
      onPress={props.submit}
    />
  );
}
