import type { UsageLimit } from '@repo/contracts';
import type { AccountJson } from './vendor-usage-reading';

export type StatusReply = { result?: AccountJson; failed?: boolean };

export type AccountUsageProtocol = {
  args: readonly string[];
  initialize: AccountJson;
  initialized?: AccountJson;
  read: AccountJson;
  response: (message: AccountJson, id: number) => StatusReply | undefined;
};

export type AccountUsageReader = {
  protocol: AccountUsageProtocol;
  decode: (
    response: AccountJson,
    observedAt: string,
  ) => UsageLimit[] | undefined;
};
