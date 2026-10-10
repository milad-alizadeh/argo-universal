import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { NavigationMock } from '../../../../mocks/navigation-mock';
import { createNavigationRecorder } from '../../../../mocks/with-navigation-mocks';

const recorder = createNavigationRecorder();

const meta = {
  title: 'Tests/Navigation',
  component: NavigationMock,
  parameters: { navigation: recorder },
  beforeEach: (): void => recorder.reset(),
} satisfies Meta<typeof NavigationMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RecordsNavigation: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Open Session' }));
    await expect(recorder.destinations).toEqual([
      { to: 'session', id: 'session-1' },
    ]);
  },
};
