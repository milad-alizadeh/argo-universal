import { useState, type ReactElement } from 'react';
import { MergePrButton, type MergePrButtonProps } from './merge-pr-button';

// The owning view keeps a selected method and persists each choice through the public callback.
export function ControlledMergeButton(props: MergePrButtonProps): ReactElement {
  const [method, setMethod] = useState(props.method);

  const onMethodChange = (next: MergePrButtonProps['method']): void => {
    setMethod(next);
    props.onMethodChange(next);
  };

  return (
    <MergePrButton {...props} method={method} onMethodChange={onMethodChange} />
  );
}
