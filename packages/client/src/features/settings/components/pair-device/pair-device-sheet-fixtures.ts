import type { PairDeviceSheetProps } from './pair-device-sheet';

type Shown = Pick<PairDeviceSheetProps, 'open' | 'code'>;

// A code the Server has handed out, with most of its two minutes still to run.
export const live = {
  open: true,
  code: {
    status: 'live',
    invite: {
      key: 'Zt1kZ4cXG1Aq3SfKk2o0y0m5wq0jW1u0m3b2L9vYQp8',
      server: 'Studio Mac',
      ticket: '048213',
    },
    expiresAt: '2026-10-31T12:02:00.000Z',
  },
} satisfies Shown;

export const expired = {
  open: true,
  code: { status: 'expired' },
} satisfies Shown;

export const minting = {
  open: true,
  code: { status: 'minting' },
} satisfies Shown;

export const mintFailed = {
  open: true,
  code: { status: 'error' },
} satisfies Shown;

// A Device that has registered with the live code, by the name it claims for itself; untrusted, and shown only so the owner recognises it.
export const wantsToPair = {
  ...live,
  asking: {
    deviceId: 'device-7f2a',
    claimedName: 'iPhone 15 Pro',
    claimedPlatform: 'ios',
  },
} satisfies Pick<PairDeviceSheetProps, 'open' | 'code' | 'asking'>;
