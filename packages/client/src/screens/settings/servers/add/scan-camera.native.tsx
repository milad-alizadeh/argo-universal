import { Pill } from '@repo/kit/primitives/status/pill';
import { usePageFocused } from '@repo/kit/use-shown-page';
import { CameraView } from 'expo-camera';
import { useState } from 'react';
import type * as React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  afterRead,
  cameraFailed,
  looking,
  noticeText,
  type ScanNotice,
} from './scan-notice';

export interface ScanCameraProps {
  // Each code the camera reads; the owner of the page decides what that is, and says whether it was an Argo code.
  onRead: (scanned: string) => boolean;
}

const qrOnly = { barcodeTypes: ['qr' as const] };

/*
 * The back camera, reading QR codes only, with the words that say what it is doing.
 * A stack keeps this page mounted behind the one pushed on it, and a preview left there comes back
 * blank (Expo: unmount a CameraView whenever its screen is unfocused), so it is drawn only while the
 * page is focused.
 * A code that is read and refused, or a camera that does not start, is said on screen rather than left silent.
 */
export function ScanCamera(props: ScanCameraProps): React.JSX.Element {
  const [notice, setNotice] = useState<ScanNotice>(looking);

  return (
    <View className="flex-1 items-center justify-end">
      {usePageFocused() ? <Preview {...props} setNotice={setNotice} /> : null}
      <Pill text={noticeText(notice)} />
    </View>
  );
}

function Preview(
  props: ScanCameraProps & { setNotice: (notice: ScanNotice) => void },
): React.JSX.Element {
  return (
    <CameraView
      style={StyleSheet.absoluteFill}
      facing="back"
      barcodeScannerSettings={qrOnly}
      onMountError={({ message }) => props.setNotice(cameraFailed(message))}
      onBarcodeScanned={({ data }) =>
        props.setNotice(afterRead(props.onRead(data), data))
      }
    />
  );
}
