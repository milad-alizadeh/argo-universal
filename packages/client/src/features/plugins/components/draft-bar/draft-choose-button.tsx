import { Button } from '@repo/kit/primitives/actions/button';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';

const plural = (comments: number): string =>
  `${comments} ${comments === 1 ? 'comment' : 'comments'}`;

// What a screen reader hears, and a wide window reads: the count in words.
function chooseLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${plural(comments)}`;
}

// A phone's bar has no room for the word, so it keeps the count alone.
function chooseCompactLabel(comments: number): string {
  if (comments === 0) return 'Choose';

  return `Choose · ${comments}`;
}

export function DraftChooseButton({
  comments,
  onPress,
}: {
  comments: number;
  onPress: () => void;
}): React.JSX.Element {
  const spoken = chooseLabel(comments);

  return (
    <SizeClass
      compact={
        <Button
          label={chooseCompactLabel(comments)}
          accessibilityLabel={spoken}
          size="sm"
          onPress={onPress}
        />
      }
      wide={<Button label={spoken} size="sm" onPress={onPress} />}
    />
  );
}
