import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import { sourceCopy } from './project-new-copy';
import type { SourceFormProps } from './project-new-view';

type ActionsProps = Pick<SourceFormProps, 'source' | 'adding'> & {
  disabled?: boolean;
  value: string;
  submit: () => void;
};

export function ProjectSourceActions(props: ActionsProps): React.JSX.Element {
  const copy = sourceCopy[props.source];

  return (
    <Button
      label={props.adding ? copy.pending : copy.action}
      loading={props.adding}
      fullWidth
      disabled={props.disabled || !props.value.trim()}
      onPress={props.submit}
    />
  );
}
