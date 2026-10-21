import type { ComponentProps } from 'react';
import { Text } from '#primitives/content/text';
import { Stack } from '#primitives/layout/stack';
import { Surface } from '#primitives/layout/surface';
import type { ScrollView } from './scroll-view';

const rows = Array.from({ length: 12 }, (_, index) => `Item ${index + 1}`);

type ScrollViewProps = ComponentProps<typeof ScrollView>;

export const verticalScrollView = {
  direction: 'vertical',
  children: (
    <Stack direction="column" gap={3}>
      {rows.map((row) => (
        <Text key={row}>{row}</Text>
      ))}
    </Stack>
  ),
} satisfies ScrollViewProps;

export const horizontalScrollView = {
  direction: 'horizontal',
  children: (
    <Stack direction="row" gap={3}>
      {rows.map((row) => (
        <Surface key={row} kind="card" padding={4}>
          <Text>{row}</Text>
        </Surface>
      ))}
    </Stack>
  ),
} satisfies ScrollViewProps;

export const contentFitsScrollView = {
  children: <Text>All up to date</Text>,
} satisfies ScrollViewProps;
