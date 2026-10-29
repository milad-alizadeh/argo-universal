import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { expect, it } from 'vitest';
import { z } from 'zod';

const run = promisify(execFile);

const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const exerciseChannels = String.raw`
const { EventEmitter } = require('node:events');
const net = require('node:net');
const path = require('node:path');
const { createRequire } = require('node:module');
const appRequire = createRequire(path.resolve('apps/storybook/package.json'));
const addonPackage = appRequire.resolve('@storybook/addon-react-native-server/package.json');
const addonRequire = createRequire(addonPackage);
const WebSocket = addonRequire('ws');
const { experimental_serverChannel } = appRequire('@storybook/addon-react-native-server/preset');
const EVENTS = appRequire('storybook/internal/core-events');

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function waitPort(port) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ready = await new Promise((resolve) => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Storybook sync server did not start');
}

async function startChannel(options) {
  const channel = new EventEmitter();
  await experimental_serverChannel(channel, {
    configType: 'DEVELOPMENT',
    presets: { apply: async (key) => key === 'reactNativeServerOptions' ? options : undefined },
    loglevel: 'error',
  });
  await waitPort(options.port);
  return channel;
}

async function connect(port) {
  const socket = new WebSocket('ws://127.0.0.1:' + port);
  await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
  return socket;
}

(async () => {
  const webPort = await freePort();
  const otherPort = await freePort();
  process.env.EXPO_PUBLIC_STORYBOOK_WS_PORT = String(webPort);
  const config = (await import('./apps/storybook/.storybook/main.ts')).default;
  const { storybookSyncPort, storybookServerOptions } = await import('./tools/storybook-sync-port.js');
  const nativePort = storybookSyncPort();
  if (config.reactNativeServerOptions.port !== nativePort || nativePort !== webPort)
    throw new Error('The web addon and native client resolved different ports');

  const firstChannel = await startChannel(config.reactNativeServerOptions);
  const secondChannel = await startChannel(storybookServerOptions(String(otherPort)));
  const source = await connect(nativePort);
  const sameSession = await connect(nativePort);
  const otherSession = await connect(otherPort);
  const collect = (socket) => {
    const messages = [];
    socket.on('message', (data) => messages.push(JSON.parse(data.toString())));
    return messages;
  };
  const sameMessages = collect(sameSession);
  const otherMessages = collect(otherSession);
  const story = { storyId: 'composer-typography--selected' };
  source.send(JSON.stringify({ type: EVENTS.SELECT_STORY, args: [story] }));
  await new Promise((resolve) => setTimeout(resolve, 75));
  const sameChannelReceived = sameMessages.some((message) =>
    message.type === EVENTS.SELECT_STORY && message.args?.[0]?.storyId === story.storyId,
  );
  const otherChannelReceived = otherMessages.some((message) =>
    message.type === EVENTS.SELECT_STORY && message.args?.[0]?.storyId === story.storyId,
  );
  for (const socket of [source, sameSession, otherSession]) socket.close();
  firstChannel.removeAllListeners();
  secondChannel.removeAllListeners();
  console.log(JSON.stringify({ sameChannelReceived, otherChannelReceived }));
  process.exit(sameChannelReceived && !otherChannelReceived ? 0 : 1);
})().catch((error) => { console.error(error); process.exit(1); });
`;

it('syncs story selection within a session and isolates a second session', async (): Promise<void> => {
  const { stdout } = await run(
    process.execPath,
    ['--import', 'tsx', '--input-type=commonjs', '-e', exerciseChannels],
    { cwd: repoRoot, timeout: 15_000 },
  );

  const result = z
    .object({
      sameChannelReceived: z.boolean(),
      otherChannelReceived: z.boolean(),
    })
    .parse(JSON.parse(stdout.trim().split('\n').at(-1) ?? '{}'));

  expect(result).toEqual({
    sameChannelReceived: true,
    otherChannelReceived: false,
  });
});
