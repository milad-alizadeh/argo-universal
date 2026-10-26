import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { useListLook, useSectionDrawing } from './list-look-context';
import { cn } from './utils';

type Props = { text: string; tone?: 'danger'; id?: string };

function useFooterClass(tone: Props['tone']): string {
  const drawing = useSectionDrawing();
  const { edges } = useListLook();

  return cn('py-2', drawing.inset, edges.footer, !tone && drawing.footer);
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
