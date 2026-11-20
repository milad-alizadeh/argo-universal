import { useSubscription } from '@trpc/tanstack-react-query';
import { useMemo } from 'react';
import { useResubscribeOnReconnect, useTRPC } from '#features/connection';
import { useVoiceDeviceChoice } from '../stores/conversation-device-choice';
import { deviceReportOf, onDeviceRequest } from '../utils/conversation-device-report';
import { useAudioDevices } from './use-conversation-devices';

// Reports this Device's microphones and speakers to the Server again whenever they or the choice change (ADR-0064).
export function useReportedVoiceDevices(): void {
  const trpc = useTRPC();
  const devices = useAudioDevices(true);
  const { choice, choose } = useVoiceDeviceChoice();

  const report = useMemo(
    () => deviceReportOf(devices, choice),
    [devices, choice],
  );

  const subscription = useSubscription(
    trpc.voice.devices.subscriptionOptions(report, {
      onData: onDeviceRequest(choose),
    }),
  );

  useResubscribeOnReconnect(subscription);
}
