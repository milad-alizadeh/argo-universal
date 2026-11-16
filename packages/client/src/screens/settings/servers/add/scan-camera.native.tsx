import { CodeScanner } from '@repo/kit/primitives/content/code-scanner';
import { usePageFocused } from '@repo/kit/use-shown-page';
import { CameraView } from 'expo-camera';
import { useEffect, useState } from 'react';
import type * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import {
  afterRead,
  cameraFailed,
  looking,
  type ScanNotice,
  scannerProps,
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

  useSpokenNotice(notice);

  return (
    <CodeScanner
      preview={
        usePageFocused() ? <Preview {...props} setNotice={setNotice} /> : null
      }
      {...scannerProps(notice)}
    />
  );
}

/*
 * Android reads a change in the notice from its live region; iOS has none, so VoiceOver is told each new refusal or
 * failure once. The same code read again sets the same words, which says nothing new.
 */
function useSpokenNotice(notice: ScanNotice): void {
  const text = scannerProps(notice).notice;
  const worthSaying = notice.kind !== 'looking';

  useEffect(() => {
    if (worthSaying && Platform.OS === 'ios')
      AccessibilityInfo.announceForAccessibility(text);
  }, [text, worthSaying]);
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
