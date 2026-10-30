// THROWAWAY SPIKE (#1488): proves discovery and three transports from a real device. Not product code.
import * as React from 'react';
import { Button, ScrollView, Text, TextInput, View } from 'react-native';
import TcpSocket from 'react-native-tcp-socket';
import Zeroconf from 'react-native-zeroconf';

const defaultUrl = process.env.EXPO_PUBLIC_ARGO_SERVER_URL ?? 'ws://127.0.0.1:17731';

export function SpikeScreen(): React.JSX.Element {
  const [url, setUrl] = React.useState(defaultUrl);
  const parsed = new URL(url.replace('ws://', 'http://'));
  const [lines, setLines] = React.useState<string[]>([]);
  const log = React.useCallback(
    (line: string) =>
      setLines((old) => [
        ...old,
        `${new Date().toISOString().slice(11, 19)} ${line}`,
      ]),
    [],
  );

  const discover = (): void => {
    const zeroconf = new Zeroconf();
    log('browsing _argo._tcp ...');
    zeroconf.on('resolved', (service: unknown) =>
      log(`FOUND ${JSON.stringify(service)}`),
    );
    zeroconf.on('error', (error: unknown) =>
      log(`DISCOVERY ERROR ${String(error)}`),
    );
    zeroconf.scan('argo', 'tcp', 'local.');
    setTimeout(() => {
      zeroconf.stop();
      log('browse stopped');
    }, 15000);
  };

  const websocket = (): void => {
    log(`WebSocket ${url} ...`);
    const socket = new WebSocket(url);
    socket.onopen = (): void => {
      log('WS OPEN');
      socket.close();
    };
    socket.onerror = (event: unknown): void =>
      log(`WS ERROR ${JSON.stringify(event)}`);
    socket.onclose = (event): void =>
      log(`WS CLOSE ${event.code} ${event.reason}`);
  };

  const http = (): void => {
    log(`fetch http://${parsed.host}/ ...`);
    fetch(`http://${parsed.host}/`).then(
      (response) => log(`HTTP ${response.status}`),
      (error: unknown) => log(`HTTP ERROR ${String(error)}`),
    );
  };

  const tcp = (): void => {
    const port = Number(parsed.port) + 1;
    log(`TCP ${parsed.hostname}:${port} ...`);
    const socket = TcpSocket.createConnection(
      { host: parsed.hostname, port },
      () => log('TCP CONNECTED'),
    );
    socket.on('data', (data) => {
      log(`TCP DATA ${String(data).trim()}`);
      socket.destroy();
    });
    socket.on('error', (error) => log(`TCP ERROR ${String(error)}`));
  };

  return (
    <View style={{ flex: 1, paddingTop: 70, padding: 16 }}>
      <Text style={{ fontWeight: '700' }}>Argo spike #1488 — Server URL:</Text>
      <TextInput value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} style={{ borderWidth: 1, padding: 8 }} />
      <Button title="1. Discover (mDNS)" onPress={discover} />
      <Button title="2. WebSocket (ws://)" onPress={websocket} />
      <Button title="3. Plain HTTP fetch" onPress={http} />
      <Button title="4. Raw TCP socket" onPress={tcp} />
      <ScrollView>
        {lines.map((line, index) => (
          <Text key={index} selectable style={{ fontSize: 12 }}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
