import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { latencyProbe } from '../../stores/latency-probe';
import { latencySummaryOf, latencyTextOf } from '../../utils/latency-text';

/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): a floating panel with a call's latency numbers, shown on
 * the desktop App and on a phone once a call has started. It lives on the spike's branch only.
 */

// The App does not read the network, so the person says which one a run was on.
const networks = [
  'Wi-Fi',
  'Cellular',
  'Bluetooth + Wi-Fi',
  'Bluetooth + Cellular',
];

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const panelTop = Platform.select({ web: 44, default: 100 });

const styles = StyleSheet.create({
  text: { fontFamily: mono, fontSize: 11, lineHeight: 15 },
  button: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  placement: {
    position: 'absolute',
    top: panelTop,
    right: 8,
    left: 8,
    alignItems: 'flex-end',
  },
  panel: { borderRadius: 10, padding: 8, gap: 8, maxWidth: '100%' },
  actions: { flexDirection: 'row', gap: 8 },
});

function PanelButton(props: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      className="bg-ink-on-dark/15"
      style={styles.button}
    >
      <Text className="text-ink-on-dark" style={styles.text}>
        {props.label}
      </Text>
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
  });

  const copy = (): void =>
    void setStringAsync(body).then(() => setCopied(true));

  return (
    <View pointerEvents="box-none" style={styles.placement}>
      <View className="bg-scrim/85" style={styles.panel}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Latency panel"
          onPress={() => {
            setOpen(!open);
            setCopied(false);
          }}
        >
          <Text className="text-ink-on-dark" style={styles.text}>
            {open ? body : `⏱ ${latencySummaryOf(report)}`}
          </Text>
        </Pressable>
        {open ? (
          <View style={styles.actions}>
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
