import type * as React from 'react';
import { useNavigate } from '#lib/product/navigation/navigation';
import { DeviceDetailView } from './device-detail-view';
import { useDeviceDetail, useUnpairDevice } from './use-devices';

export interface DeviceDetailScreenProps {
  deviceId: string;
}

// A Paired Device's page. Only the Server Device reaches the Server's Devices, so the reads sit in this child.
export function DeviceDetailScreen({
  deviceId,
}: DeviceDetailScreenProps): React.JSX.Element {
  const navigate = useNavigate();
  const back = (): void => navigate('/settings/devices');
  const unpair = useUnpairDevice(back);

  return (
    <DeviceDetailView
      device={useDeviceDetail(deviceId)}
      onUnpair={() => unpair(deviceId)}
      onBack={back}
    />
  );
}
