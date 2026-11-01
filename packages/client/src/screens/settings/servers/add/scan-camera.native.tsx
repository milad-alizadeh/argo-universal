import { Pill } from '@repo/kit/primitives/status/pill';
import { CameraView } from 'expo-camera';
import type * as React from 'react';
import { StyleSheet, View } from 'react-native';

export interface ScanCameraProps {
  // Each frame that holds a QR code reports what it read; the owner of the page decides what that is.
  onRead: (scanned: string) => void;
}

// The back camera, reading QR codes only, with the words that say it is looking.
export function ScanCamera(props: ScanCameraProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-end">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => props.onRead(data)}
      />
      <Pill text="Point the camera at the code" />
    </View>
  );
}
