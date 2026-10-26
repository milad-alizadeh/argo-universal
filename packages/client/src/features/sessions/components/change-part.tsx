import type { ReactElement } from 'react';
import { Pressable, type PressableProps } from 'react-native';

// One part of a Change row that presses on its own; the row itself never does.
export function ChangePart(props: PressableProps): ReactElement {
  return (
    <Pressable
      role="button"
      className="rounded-control web:hover:bg-hover web:focus-visible:bg-hover"
      {...props}
    />
  );
}
