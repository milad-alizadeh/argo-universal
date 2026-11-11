import type {
  DeviceFlowArgo,
  DeviceFlowEnd,
  DeviceFlowOptions,
  DeviceFlowState,
} from '@repo/contracts/plugins/device-flow-api';
import type { z } from 'zod';
import { postForm, TokenAnswer } from './device-http';

const deviceGrant = 'urn:ietf:params:oauth:grant-type:device_code';

// What the service gave the code's holder, and when it stops taking it.
export type Device = { code: string; expiresAt: number };

export const ended = (
  end: DeviceFlowEnd,
  message: string,
): DeviceFlowState => ({ kind: 'ended', end, message });

const messages = (name: string): Record<DeviceFlowEnd, string> => ({
  denied: `You turned the request down on ${name}.`,
  expired: `${name} codes run out. Ask for a new one.`,
  failed: `${name} refused the sign-in.`,
});

export const expired = ({ name }: DeviceFlowOptions): DeviceFlowState =>
  ended('expired', messages(name).expired);

// What one poll found: the token, a reason to wait longer, or the end of the sign-in.
export type Polled =
  | { kind: 'token'; token: string }
  | { kind: 'wait'; slower: boolean }
  | { kind: 'ended'; state: DeviceFlowState };

const endings = new Map<string, DeviceFlowEnd>([
  ['access_denied', 'denied'],
  ['expired_token', 'expired'],
]);

const endOf = (
  { name }: DeviceFlowOptions,
  { error, error_description: why }: z.infer<typeof TokenAnswer>,
): Polled => {
  const end = endings.get(String(error)) ?? 'failed';

  return { kind: 'ended', state: ended(end, why ?? messages(name)[end]) };
};

type TokenFields = {
  client_id: string;
  device_code: string;
  grant_type: string;
};

const tokenFields = (
  { clientId }: DeviceFlowOptions,
  { code }: Device,
): TokenFields => ({
  client_id: clientId,
  device_code: code,
  grant_type: deviceGrant,
});

const waits = new Set(['authorization_pending', 'slow_down']);

// One ask of the token endpoint (RFC 8628 section 3.4).
export async function pollOnce(
  fetch: DeviceFlowArgo['fetch'],
  options: DeviceFlowOptions,
  device: Device,
): Promise<Polled> {
  const target = {
    url: options.tokenUrl,
    fields: tokenFields(options, device),
  };
  const reply = await postForm(fetch, target, TokenAnswer);

  if (reply.access_token) return { kind: 'token', token: reply.access_token };

  return waits.has(String(reply.error))
    ? { kind: 'wait', slower: reply.error === 'slow_down' }
    : endOf(options, reply);
}
