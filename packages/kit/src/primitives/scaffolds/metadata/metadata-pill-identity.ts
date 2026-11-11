import type { PillProps } from '#primitives/status/pill';

// A Pill's identity among its siblings, from everything it draws.
export const pillIdentity = (pill: PillProps): string => JSON.stringify(pill);
