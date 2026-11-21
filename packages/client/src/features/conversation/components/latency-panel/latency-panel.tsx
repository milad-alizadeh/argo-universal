import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { latencyProbe } from '../../stores/latency-probe';
import { phoneAudioRoute } from '../../stores/phone-conversation-environment';
import { latencySummaryOf, latencyTextOf } from '../../utils/latency-text';

/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): a floating panel with a call's latency numbers, shown on
 * the desktop App and on a phone once a call has started. It lives on the spike's branch only, so it is drawn with
 * plain views and fixed colours, outside the kit.
 */

// The App does not read the network, so the person says which one a run was on.
const networks = ['Wi-Fi', 'Cellular', 'Bluetooth + Wi-Fi', 'Bluetooth + Cellular'];

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const text = { color: '#fff', fontFamily: mono, fontSize: 11, lineHeight: 15 };

const button = {
  backgroundColor: '#ffffff26',
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 6,
};

function PanelButton(props: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" onPress={props.onPress} style={button}>
      <Text style={text}>{props.label}</Text>
    </Pressable>
  );
}

export function LatencyPanel(): React.JSX.Element | null {
  const report = useSyncExternalStore(
    latencyProbe.subscribe,
    latencyProbe.read,
    latencyProbe.read,
  );

  const [open, setOpen] = useState(false);
  const [network, setNetwork] = useState(0);
  const [copied, setCopied] = useState(false);

  if (!report) return null;

  const body = latencyTextOf(report, {
    platform: Platform.OS,
    network: networks[network] ?? '',
    route: phoneAudioRoute(),
  });

  const copy = (): void =>
    void setStringAsync(body).then(() => setCopied(true));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: Platform.OS === 'web' ? 44 : 100,
        right: 8,
        left: 8,
        alignItems: 'flex-end',
      }}
    >
      <View
        style={{
          backgroundColor: '#000000d9',
          borderRadius: 10,
          padding: 8,
          gap: 8,
          maxWidth: '100%',
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Latency panel"
          onPress={() => {
            setOpen(!open);
            setCopied(false);
          }}
        >
          <Text style={text}>
            {open ? body : `⏱ ${latencySummaryOf(report)}`}
          </Text>
        </Pressable>
        {open ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <PanelButton
              label={networks[network] ?? ''}
              onPress={() => setNetwork((network + 1) % networks.length)}
            />
            <PanelButton label={copied ? 'Copied' : 'Copy'} onPress={copy} />
          </View>
        ) : null}
      </View>
    </View>
  );
}
