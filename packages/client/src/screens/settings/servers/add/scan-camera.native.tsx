import { Pill } from '@repo/kit/primitives/status/pill';
import { usePageFocused } from '@repo/kit/use-shown-page';
import { type BarcodeScanningResult, CameraView } from 'expo-camera';
import type * as React from 'react';
import { useRef } from 'react';
import { StyleSheet, View } from 'react-native';

export interface ScanCameraProps {
  // A code the camera read, once per code; the owner of the page decides what that is.
  onRead: (scanned: string) => void;
}

// One object for every render: the camera reapplies its scanner settings whenever the prop changes.
const qrOnly = { barcodeTypes: ['qr' as const] };

/*
 * The back camera, reading QR codes only, with the words that say it is looking.
 * Only one camera preview may be active at a time, and the Expo docs ask for a CameraView to be unmounted whenever its screen is unfocused: a stack keeps this page mounted behind the one pushed on it, where its preview came back blank. The camera is drawn only while the page is focused, so coming back mounts a new one.
 */
export function ScanCamera(props: ScanCameraProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-end">
      {usePageFocused() ? <Camera onRead={props.onRead} /> : null}
      <Pill text="Point the camera at the code" />
    </View>
  );
}

// The camera reports a code on every frame that holds it, so a code is passed on once until a different one is read.
function useReadOnce(onRead: (scanned: string) => void) {
  const last = useRef<string | null>(null);

  return ({ data }: BarcodeScanningResult): void => {
    if (data === last.current) return;

    last.current = data;
    onRead(data);
  };
}

function Camera(props: ScanCameraProps): React.JSX.Element {
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={qrOnly}
      onBarcodeScanned={useReadOnce(props.onRead)}
    />
  );
}
