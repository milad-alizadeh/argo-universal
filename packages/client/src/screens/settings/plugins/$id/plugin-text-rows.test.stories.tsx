import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Pressable, Text } from 'react-native';
import { expect, fn } from 'storybook/test';
import { useTextDraft } from './plugin-text-rows';

type HarnessProps = { onSave: (value: string) => void };

// Android's dialog changes the text and blurs in one tick: both calls run in one batched handler, before a re-render.
function CommitsInOneTick({ onSave }: HarnessProps): React.JSX.Element {
  const draft = useTextDraft('old', onSave);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        draft.onChangeText('new');
        draft.onBlur();
      }}
    >
      <Text>Commit</Text>
    </Pressable>
  );
}

const meta = {
  title: 'Tests/Screens/Settings/Plugin/TextRows',
  component: CommitsInOneTick,
  args: { onSave: fn() },
} satisfies Meta<typeof CommitsInOneTick>;

export default meta;

type Story = StoryObj<typeof meta>;

export const SavesTextCommittedInTheSameTickAsBlur: Story = {
  play: async ({ canvas, args, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Commit' }));
    await expect(args.onSave).toHaveBeenCalledWith('new');
  },
};
