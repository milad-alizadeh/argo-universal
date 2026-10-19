// iOS: Expo UI's universal Checkbox, SwiftUI's own toggle. Android draws the same Compose row with Argo's colours.
import { Checkbox, type CheckboxProps } from '@expo/ui';
import type { ReactElement } from 'react';

// Inline sizes the label to the content beside it; SwiftUI's toggle takes that from its modifiers.
export type CheckboxBoxProps = CheckboxProps & { inline?: boolean };

export function CheckboxBox({
  inline: _inline,
  ...props
}: CheckboxBoxProps): ReactElement {
  return <Checkbox {...props} />;
}
