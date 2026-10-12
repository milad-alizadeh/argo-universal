import type * as React from 'react';
import { useState } from 'react';
import { RichTextarea } from '../src/lib/generic/primitives/inputs/rich-textarea/rich-textarea';

// A RichTextarea that keeps its own value, as the Composer's draft does, for RichTextarea stories.
export function RichTextareaExample({
  initialValue = '',
  onChangeText,
  onSubmit,
}: {
  initialValue?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
}): React.JSX.Element {
  const [value, setValue] = useState(initialValue);
  return (
    <RichTextarea
      accessibilityLabel="Message"
      placeholder="Message the Agent…"
      value={value}
      onChangeText={(changed) => {
        setValue(changed);
        onChangeText?.(changed);
      }}
      onSubmit={onSubmit}
    />
  );
}
