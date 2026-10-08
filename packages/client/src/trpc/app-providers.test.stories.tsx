import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ConnectionMock, mockWebSocket } from '../../mocks/connection-mock';

// AppProviders opens a real Connection, so these stories swap the browser's WebSocket for a mock.
const meta = {
  title: 'Tests/AppProviders',
  component: ConnectionMock,
  beforeEach: mockWebSocket,
} satisfies Meta<typeof ConnectionMock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ClosesItsConnectionOnUnmount: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));
    await expect(await canvas.findByText('Open Connections: 1')).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Unmount' }));
    await expect(await canvas.findByText('Open Connections: 0')).toBeVisible();
    await expect(canvas.getByText('Closed Connections: 1')).toBeVisible();
  },
};

export const GivesScreensAnOpenConnectionUnderStrictMode: Story = {
  args: { strictMode: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));

    // A closed Connection reads idle, so the screens never saw one.
    await expect(
      await canvas.findByText(
        'Connection states the screens saw: connecting, pending',
      ),
    ).toBeVisible();
    await expect(canvas.getByText('Open Connections: 1')).toBeVisible();
    // StrictMode repeats the subscription; the first Connection closes before its machine allows a WebSocket.
    await expect(canvas.getByText('Screen subscriptions: 2')).toBeVisible();
    await expect(canvas.getByText('Closed Connections: 0')).toBeVisible();
  },
};

export const ReconnectsAfterServerChanges: Story = {
  args: { strictMode: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));
    await expect(await canvas.findByText('Open Connections: 1')).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Switch Server' }),
    );
    await expect(
      await canvas.findByText('Server: ws://127.0.0.1:7338'),
    ).toBeVisible();
    await expect(canvas.getByText('Open Connections: 1')).toBeVisible();
    await expect(canvas.getByText('Closed Connections: 1')).toBeVisible();
    await expect(
      canvas.getByText(
        'Connection states the screens saw: connecting, pending',
      ),
    ).toBeVisible();
  },
};
