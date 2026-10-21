import type { PluginFailure } from '@repo/contracts/plugins/runtime';
import type { ErrorToast } from '#primitives/overlays/toast';

/*
 * A stopped Plugin is gone until it starts again, so its toast names the Plugin alone. A drawing
 * failure leaves it running, with its other pages, Slots, Hooks and background pass untouched
 * (ADR-0037), so its toast says only that a view of it went undrawn. The Engine rolls a Plugin's
 * failed Openings up to its latest, so neither title can name one.
 */
const failureTitles = {
  stopped: (name: string): string => `${name} stopped`,
  drawing: (name: string): string => `${name} could not draw a view`,
} as const;

export const pluginFailureToast = (failure: PluginFailure): ErrorToast => ({
  title: failureTitles[failure.kind](failure.name),
  message: failure.message,
  key: failure.key,
});
