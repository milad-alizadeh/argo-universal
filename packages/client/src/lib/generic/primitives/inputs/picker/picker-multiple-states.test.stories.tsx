import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, within } from 'storybook/test';
import { settleViewport } from '../../../settle-viewport';
import { Picker } from './picker';

const labels = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
];

const meta = {
  title: 'Tests/Picker/Multiple states',
  beforeEach: async (): Promise<void> => {
    await settleViewport(1440);
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const LoadingAndUnavailable: Story = {
  render: () => (
    <>
      <Picker<string>
        multiple
        label="Loading"
        loading
        options={[]}
        onValueChange={() => {}}
      />
      <Picker<string>
        multiple
        label="Removed"
        value={['removed']}
        options={labels}
        onValueChange={() => {}}
      />
    </>
  ),
  play: async ({ canvas, userEvent }) => {
    await expect(
      canvas.getByRole('button', { name: 'Loading' }),
    ).toHaveTextContent('Loading…');
    const removed = canvas.getByRole('button', { name: 'Removed' });
    await expect(removed).toHaveTextContent('removed (unavailable)');
    await userEvent.click(canvas.getByRole('button', { name: 'Loading' }));
    await expect(
      await within(document.body).findByRole('status'),
    ).toHaveTextContent('Loading options…');
  },
};
