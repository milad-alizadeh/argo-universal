// THROWAWAY SPIKE (#1488): proves discovery and three transports from a real device. Not product code.
import { useCallback, useState, type JSX } from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf, { type Service } from 'react-native-zeroconf';

const defaultUrl =
  process.env.EXPO_PUBLIC_ARGO_SERVER_URL ?? 'ws://127.0.0.1:17731';

const browseMilliseconds = 15_000;

const clockStart = 11;

const clockEnd = 19;

type Log = (line: string) => void;

type Line = { id: number; text: string };

type Target = { host: string; hostname: string; tcpPort: number };

const targetOf = (url: string): Target => {
  const parsed = new URL(url.replace('ws://', 'http://'));

  return {
    host: parsed.host,
    hostname: parsed.hostname,
    tcpPort: Number(parsed.port) + 1,
  };
};

const discover = (log: Log): void => {
  const zeroconf = new Zeroconf();
  log('browsing _argo._tcp ...');
  zeroconf.on('resolved', (service: Service) => {
    log(`FOUND ${JSON.stringify(service)}`);
  });
  zeroconf.on('error', (error: Error) => log(`DISCOVERY ERROR ${error}`));
  zeroconf.scan('argo', 'tcp', 'local.');
  setTimeout(() => {
    zeroconf.stop();
    log('browse stopped');
  }, browseMilliseconds);
};

const websocket = (url: string, log: Log): void => {
  log(`WebSocket ${url} ...`);
  const socket = new WebSocket(url);
  socket.onopen = (): void => {
    log('WS OPEN');
    socket.close();
  };

  socket.onerror = (event): void => log(`WS ERROR ${JSON.stringify(event)}`);
  socket.onclose = (event): void =>
    log(`WS CLOSE ${event.code} ${event.reason}`);
};

const http = ({ host }: Target, log: Log): void => {
  log(`fetch http://${host}/ ...`);
  fetch(`http://${host}/`).then(
    (response) => log(`HTTP ${response.status}`),
    (error: Error) => log(`HTTP ERROR ${error}`),
  );
};

const tcp = ({ hostname, tcpPort }: Target, log: Log): void => {
  log(`TCP ${hostname}:${tcpPort} ...`);

  const socket = TcpSocket.createConnection(
    { host: hostname, port: tcpPort },
    () => log('TCP CONNECTED'),
  );

  socket.on('data', (data) => {
    log(`TCP DATA ${String(data).trim()}`);
    socket.destroy();
  });

  socket.on('error', (error) => log(`TCP ERROR ${error}`));
};

const useLog = (): [Line[], Log] => {
  const [lines, setLines] = useState<Line[]>([]);

  const log = useCallback(
    (text: string): void =>
      setLines((old) => [
        ...old,
        {
          id: old.length,
          text: `${new Date().toISOString().slice(clockStart, clockEnd)} ${text}`,
        },
      ]),
    [],
  );

  return [lines, log];
};

function Actions({ url, log }: { url: string; log: Log }): JSX.Element {
  const target = targetOf(url);

  return (
    <>
      <Button title="1. Discover (mDNS)" onPress={() => discover(log)} />
      <Button
        title="2. WebSocket (ws://)"
        onPress={() => websocket(url, log)}
      />
      <Button title="3. Plain HTTP fetch" onPress={() => http(target, log)} />
      <Button title="4. Raw TCP socket" onPress={() => tcp(target, log)} />
    </>
  );
}

function Lines({ lines }: { lines: Line[] }): JSX.Element {
  return (
    <ScrollView>
      {lines.map(({ id, text }) => (
        <Text key={id} selectable style={{ fontSize: 12 }}>
          {text}
        </Text>
      ))}
    </ScrollView>
  );
}

function UrlField(props: {
  url: string;
  onChange: (url: string) => void;
}): JSX.Element {
  return (
    <TextInput
      value={props.url}
      onChangeText={props.onChange}
      autoCapitalize="none"
      autoCorrect={false}
      style={{ borderWidth: 1, padding: 8 }}
    />
  );
}

export function SpikeScreen(): JSX.Element {
  const [url, setUrl] = useState(defaultUrl);
  const [lines, log] = useLog();

  return (
    <View style={{ flex: 1, padding: 16, paddingTop: 70 }}>
      <Text style={{ fontWeight: '700' }}>Argo spike #1488: Server URL</Text>
      <UrlField url={url} onChange={setUrl} />
      <Actions url={url} log={log} />
      <Lines lines={lines} />
    </View>
  );
}
