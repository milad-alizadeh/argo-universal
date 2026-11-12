import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
  DeviceFlowState,
} from '@repo/contracts/plugins/device-flow-api';
import type { z } from 'zod';
import { CodeAnswer, CompleteCode, postForm } from './device-http';
import type { Device } from './device-poll';

const msPerSecond = 1000;

// What asking for a code needs of an attempt.
type Asking = { argo: DeviceFlowArgo; options: DeviceFlowOptions };

// What the service gave for the code, when it gave one.
export type Code = {
  device: Device;
  userCode: string;
  uri: string;
  lifetimeMs: number;
  intervalMs: number;
};

const msOf = (seconds: number): number => seconds * msPerSecond;

export const codeOf = (reply: z.infer<typeof CodeAnswer>): Code | null => {
  const complete = CompleteCode.safeParse(reply);

  if (!complete.success) return null;

  const { device_code: code, user_code: userCode } = complete.data;
  const lifetimeMs = msOf(complete.data.expires_in);

  return {
    device: { code, expiresAt: Date.now() + lifetimeMs },
    userCode,
    uri: complete.data.verification_uri,
    lifetimeMs,
    intervalMs: msOf(complete.data.interval),
  };
};

export const shown = (found: Code): DeviceFlowState => ({
  kind: 'code',
  userCode: found.userCode,
  verificationUri: found.uri,
  expiresAt: found.device.expiresAt,
  lifetimeMs: found.lifetimeMs,
});

export const askFor = (
  attempt: Asking,
): Promise<z.infer<typeof CodeAnswer>> => {
  const { argo, options } = attempt;

  const fields = {
    client_id: options.clientId,
    ...(options.scope && { scope: options.scope }),
  };

  return postForm(argo.fetch, { url: options.deviceUrl, fields }, CodeAnswer);
};
