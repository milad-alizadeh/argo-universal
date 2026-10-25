import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';
import { groupedFooter, useWebGrouped } from './list-grouped';
import { useSectionDrawing, type SectionDrawing } from './list-section-drawing';
import { cn } from './utils';

type Props = { text: string; tone?: 'danger'; id?: string };

const footerClass = (
  drawing: SectionDrawing,
  grouped: boolean,
  tone: Props['tone'],
): string =>
  cn('py-2', drawing.inset, grouped && groupedFooter, !tone && drawing.footer);

// Inset and coloured as its section's header; a failure keeps the danger tone.
export function ListFooter({ text, tone, id }: Props): ReactElement {
  const className = footerClass(useSectionDrawing(), useWebGrouped(), tone);

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
