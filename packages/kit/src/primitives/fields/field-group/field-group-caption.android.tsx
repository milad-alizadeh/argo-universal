import { Column } from '@expo/ui/jetpack-compose';
import { padding } from '@expo/ui/jetpack-compose/modifiers';
import type { ReactNode } from 'react';
import { NativeText } from '#primitives/content/native-text';
import type { CaptionProps, Insets } from './field-group-caption-insets';

const inset = (insets: Insets): ReturnType<typeof padding> =>
  padding(insets.start, insets.top, insets.end, insets.bottom);

// The title or footer in the kit's type role, muted as Material's variant colour.
export function Caption(props: CaptionProps): ReactNode {
  if (!props.text) return null;

  return (
    <Column modifiers={[inset(props.insets)]}>
      <NativeText role={props.role} tone="muted">
        {props.text}
      </NativeText>
    </Column>
  );
}
