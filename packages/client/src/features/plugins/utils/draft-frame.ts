import type { WireNode } from '@repo/contracts/plugins/wire';
import { pluginPageFallback } from '@repo/contracts/plugins/wire-limits';
import type { DraftBarModel } from './draft-bar-model';

const framed = (text: string): WireNode => ({
  ...pluginPageFallback,
  props: { ...pluginPageFallback.props, children: text },
});

/*
 * What a Draft page draws in place of its tree when it cannot draw the state chosen: the Plugin page's own
 * fallback, saying why (ADR-0057). A state the Draft does not declare is named before any failure the Loader
 * has for it, since the Loader was never meant to answer it.
 */
export function draftFrameOf(
  bar: DraftBarModel | null,
  error: string | null,
): WireNode | null {
  const state = bar?.states.find(({ id }) => id === bar.current);

  if (!bar || !state) return null;

  if (state.missing)
    return framed(
      `The ${state.label} state is not declared in this Draft. Add it to the page's states in plugin.json and answer it in the Loader.`,
    );

  if (error !== null)
    return framed(
      `The Loader could not draw the ${state.label} state: ${error}`,
    );

  return null;
}
