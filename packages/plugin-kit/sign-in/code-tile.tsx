import { IconButton, Spacer, Stack, Surface, Text } from '@argo/plugin-kit';
import type { JSX } from '@argo/plugin-kit/jsx-runtime';

type Props = { code: string };

const CodeRow = ({ code }: Props): JSX.Element => (
  <Stack direction="row" gap={2} align="center">
    <Text role="title-code" selectable>
      {code}
    </Text>
    <Spacer />
    <IconButton
      icon="copy"
      variant="ghost"
      size="sm"
      accessibilityLabel="Copy code"
      onPress={{ action: 'copy', text: code }}
    />
  </Stack>
);

export const CodeTile = ({ code }: Props): JSX.Element => (
  <Surface kind="tint" padding={4}>
    <Stack direction="column" gap={2}>
      <Text role="badge" tone="muted">
        Your code
      </Text>
      <CodeRow code={code} />
    </Stack>
  </Surface>
);
