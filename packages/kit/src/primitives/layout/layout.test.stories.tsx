import { kitComponents } from '@repo/contracts/plugins/kit';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { View } from 'react-native';
import { expect, waitFor } from 'storybook/test';
import { Text } from '#primitives/content/text';
import { Grid } from './grid';
import { ScrollView } from './scroll-view';
import { Spacer } from './spacer';
import { Stack } from './stack';
import { Surface } from './surface';

const meta = { title: 'Tests/Layout' } satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const kinds = kitComponents.Surface.props.shape.kind.options;

export const ComposesContent: Story = {
  render: () => (
    <Grid columns={{ compact: 1, medium: 2, wide: 4 }} gap={3}>
      {kinds.map((kind) => (
        <Surface key={kind} kind={kind} padding={4}>
          <Stack direction="row">
            <Text>{kind}</Text>
            <Spacer />
            <Text>{kind} content</Text>
          </Stack>
        </Surface>
      ))}
    </Grid>
  ),
  play: async ({ canvas }) => {
    for (const kind of kinds)
      await expect(canvas.getByText(`${kind} content`)).toBeVisible();
    await expect(canvas.queryByRole('button')).toBeNull();
  },
};

function ScrollingContent({
  direction,
}: {
  direction: 'vertical' | 'horizontal';
}): React.JSX.Element {
  return (
    <View className="h-32 w-64">
      <ScrollView direction={direction} accessibilityLabel="Entries">
        <Stack
          direction={direction === 'horizontal' ? 'row' : 'column'}
          gap={4}
        >
          {Array.from({ length: 20 }, (_, index) => (
            <Surface key={index} kind="card" padding={4}>
              <Text>{`Entry ${index + 1}`}</Text>
            </Surface>
          ))}
        </Stack>
      </ScrollView>
    </View>
  );
}

function reachesEnd(direction: 'vertical' | 'horizontal'): Story {
  return {
    render: () => <ScrollingContent direction={direction} />,
    play: async ({ canvas }) => {
      const end = canvas.getByText('Entry 20');
      const scroll = canvas.getByLabelText('Entries');

      scroll.scrollTop = scroll.scrollHeight;
      scroll.scrollLeft = scroll.scrollWidth;
      await waitFor(async () => {
        const content = scrollRange(end.getBoundingClientRect(), direction);
        const frame = scrollRange(scroll.getBoundingClientRect(), direction);

        await expect(Math.round(content.end)).toBeLessThanOrEqual(
          Math.ceil(frame.end),
        );
        await expect(Math.round(content.start)).toBeGreaterThanOrEqual(
          Math.floor(frame.start),
        );
      });
    },
  };
}

export const VerticalReachesEnd = reachesEnd('vertical');

export const HorizontalReachesEnd = reachesEnd('horizontal');

function scrollRange(
  rect: DOMRect,
  direction: 'vertical' | 'horizontal',
): { start: number; end: number } {
  return direction === 'vertical'
    ? { start: rect.top, end: rect.bottom }
    : { start: rect.left, end: rect.right };
}
