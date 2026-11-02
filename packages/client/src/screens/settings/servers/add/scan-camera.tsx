import type * as React from 'react';

export interface ScanCameraProps {
  onRead: (scanned: string) => void;
}

// A web App is never a Paired Device, and has no camera to read a code with (ADR-0045).
export function ScanCamera(_props: ScanCameraProps): React.JSX.Element | null {
  return null;
}
