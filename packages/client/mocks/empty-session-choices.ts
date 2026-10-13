import type { SessionConfigOption } from '@repo/contracts';
import type { ConfigurationChange, SavedChoices } from '#features/composer';

// Each saved choice the Session doesn't hold yet, in the order saved.
export const nextChange = (
  _options: SessionConfigOption[],
  saved: SavedChoices,
  applied: readonly string[],
): ConfigurationChange | undefined =>
  Object.entries(saved)
    .map(([configId, value]) => ({ configId, value }))
    .find(({ configId }) => !applied.includes(configId));
