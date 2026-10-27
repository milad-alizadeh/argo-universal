import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { useSectionDrawing } from './list-look-context';
import { cn } from './utils';

type Props = { text: string; tone?: 'danger'; id?: string };

function useFooterClass(tone: Props['tone']): string {
  const drawing = useSectionDrawing();

  return cn('py-2', drawing.inset, !tone && drawing.footer);
}

// Inset and coloured as its section's header; a failure keeps the danger tone.
export function ListFooter({ text, tone, id }: Props): ReactElement {
  const className = useFooterClass(tone);

  return (
    <Text
      className={className}
      id={id}
      role="secondary"
      tone={tone}
      accessibilityRole={tone ? 'alert' : undefined}
    >
      {text}
    </Text>
  );
}
