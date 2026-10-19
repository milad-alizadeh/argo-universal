import type { ReactElement } from 'react';
import { Text } from '#primitives/content/text';

type Props = { text: string; tone?: 'danger'; id?: string };

export function ListFooter({ text, tone, id }: Props): ReactElement {
  return (
    <Text
      className="px-4 py-2 wide:px-5"
      id={id}
      role="secondary"
      tone={tone ?? 'muted'}
      accessibilityRole={tone ? 'alert' : undefined}
    >
      {text}
    </Text>
  );
}
