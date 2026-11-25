import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';

const plural = (comments: number): string =>
  `${comments} ${comments === 1 ? 'comment' : 'comments'}`;

// What a screen reader hears, and a wide window reads: the count in words.
function chooseLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${plural(comments)}`;
}

// The bar shows the count in a compact label.
function visibleLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${comments}`;
}

export function DraftChooseButton({
  comments,
  disabled,
  onPress,
}: {
  comments: number;
  disabled?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Button
      label={visibleLabel(comments)}
      accessibilityLabel={chooseLabel(comments)}
      disabled={disabled}
      size="sm"
      onPress={onPress}
    />
  );
}
