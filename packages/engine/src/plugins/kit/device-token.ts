import type {
  DeviceFlowArgo,
  DeviceFlowOptions,
} from '@repo/contracts/plugins/device-flow-api';
import type { z } from 'zod';
import { postForm, TokenAnswer } from './device-http';
import { expiresAtMsOf, type KeptToken, type Refresh } from './kept-token';

// The token a device-flow token answer gives, or nothing when it gave no access token.
export function tokenFromAnswer(
  answer: z.infer<typeof TokenAnswer>,
): KeptToken | null {
  if (!answer.access_token) return null;

  return {
    access: answer.access_token,
    refresh: answer.refresh_token,
    expiresAtMs: expiresAtMsOf(answer.expires_in),
  };
}

// RFC 6749 section 6. A device-flow token is refreshed with the client ID alone, no client secret.
export const deviceRefresh =
  (fetch: DeviceFlowArgo['fetch'], options: DeviceFlowOptions): Refresh =>
  async (refresh) => {
    const fields = {
      client_id: options.clientId,
      grant_type: 'refresh_token',
      refresh_token: refresh,
    };

    const target = { url: options.tokenUrl, fields };

    return tokenFromAnswer(await postForm(fetch, target, TokenAnswer));
  };
