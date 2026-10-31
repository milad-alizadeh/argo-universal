import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { ConnectionMock } from './app-providers.mocks';
import { mockWebSocket } from './websocket-report.mocks';

const oneOpenConnection = 'Open Connections: 1';

const noClosedConnections = 'Closed Connections: 0';

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
    await expect(await canvas.findByText(oneOpenConnection)).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Unmount' }));
    await expect(await canvas.findByText('Open Connections: 0')).toBeVisible();
    await expect(canvas.getByText('Closed Connections: 1')).toBeVisible();
  },
};

const keptServersKey = 'known-servers';

// A Server this Device has paired with, as Pairing kept it; the App only reads the list.
const keepPairedServer = (): (() => void) => {
  window.localStorage.setItem(
    keptServersKey,
    JSON.stringify([
      {
        name: 'Studio',
        key: 'studio-key',
        address: { host: 'studio.local', port: 7339 },
      },
    ]),
  );

  return () => window.localStorage.removeItem(keptServersKey);
};

/*
 * An App that has paired with a second computer holds a Connection to each Server (ADR-0022), and goes on reading the
 * Server it is looking at through that one's Connection.
 */
export const HoldsAConnectionToEachServer: Story = {
  beforeEach: keepPairedServer,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));
    await expect(await canvas.findByText('Open Connections: 2')).toBeVisible();
    await expect(canvas.getByText(noClosedConnections)).toBeVisible();
  },
};

/*
 * Looking at another Server gives its screens a cache of their own, so no answer from one Server is ever shown for
 * another, and the Connections to both stay open while it happens (ADR-0022).
 */
export const GivesEachServerItsOwnCache: Story = {
  beforeEach: keepPairedServer,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));
    await expect(
      await canvas.findByText('Caches the screens saw: 1'),
    ).toBeVisible();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Look at Studio' }),
    );

    await expect(
      await canvas.findByText('Caches the screens saw: 2'),
    ).toBeVisible();
    await expect(canvas.getByText('Open Connections: 2')).toBeVisible();
    await expect(canvas.getByText(noClosedConnections)).toBeVisible();
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
    await expect(canvas.getByText(oneOpenConnection)).toBeVisible();
    // StrictMode repeats the subscription; the first Connection closes before it allows a WebSocket.
    await expect(canvas.getByText('Screen subscriptions: 2')).toBeVisible();
    await expect(canvas.getByText(noClosedConnections)).toBeVisible();
  },
};

export const ReconnectsAfterServerChanges: Story = {
  args: { strictMode: true },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Mount' }));
    await expect(await canvas.findByText(oneOpenConnection)).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Switch Server' }),
    );
    await expect(
      await canvas.findByText('Server: ws://127.0.0.1:7338'),
    ).toBeVisible();
    await expect(canvas.getByText(oneOpenConnection)).toBeVisible();
    await expect(canvas.getByText('Closed Connections: 1')).toBeVisible();
    await expect(
      canvas.getByText(
        'Connection states the screens saw: connecting, pending',
      ),
    ).toBeVisible();
  },
};
