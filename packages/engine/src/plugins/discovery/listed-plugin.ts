import type { PluginList } from '@repo/contracts/plugins';
import { notStarted } from '../protocol/runtime';

// A manifest the Server admitted, with its own icon as the App draws it, if it has one (ADR-0058).
export type Admitted = Pick<PluginList['plugins'][number], 'manifest'> & {
  iconMarkup: string | undefined;
};

// How an admitted Plugin is listed before it starts.
export const listed = (
  { manifest, iconMarkup }: Admitted,
  firstParty: boolean,
): PluginList['plugins'][number] => ({
  manifest,
  ...(iconMarkup !== undefined && { iconMarkup }),
  firstParty,
  enabled: true,
  ...notStarted,
});
