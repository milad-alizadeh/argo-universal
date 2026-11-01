import { Pill } from '@repo/kit/primitives/status/pill';
import { usePageFocused } from '@repo/kit/use-shown-page';
import { CameraView } from 'expo-camera';
import type * as React from 'react';
import { StyleSheet, View } from 'react-native';

export interface ScanCameraProps {
  // Each code the camera reads; the owner of the page decides what that is.
  onRead: (scanned: string) => void;
}

/*
 * The back camera, reading QR codes only, with the words that say it is looking.
 * A stack keeps this page mounted behind the one pushed on it, and a preview left there comes back
 * blank (Expo: unmount a CameraView whenever its screen is unfocused), so it is drawn only while the
 * page is focused.
 */
export function ScanCamera(props: ScanCameraProps): React.JSX.Element {
  return (
    <View className="flex-1 items-center justify-end">
      {usePageFocused() ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => props.onRead(data)}
        />
      ) : null}
      <Pill text="Point the camera at the code" />
    </View>
  );
}
