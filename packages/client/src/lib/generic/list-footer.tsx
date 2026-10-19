import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { useSectionDrawing } from './list-section-drawing';
import { cn } from './utils';

type Props = { text: string; tone?: 'danger'; id?: string };

// Inset and coloured as its section's header; a failure keeps the danger tone.
export function ListFooter({ text, tone, id }: Props): ReactElement {
  const drawing = useSectionDrawing();

  return (
    <Text
      className={cn('py-2', drawing.inset, !tone && drawing.footer)}
      id={id}
      role="secondary"
      tone={tone}
      accessibilityRole={tone ? 'alert' : undefined}
    >
      {text}
    </Text>
  );
}
