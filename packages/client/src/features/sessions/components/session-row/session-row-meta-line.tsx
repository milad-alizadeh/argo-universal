import { type DrawMore, FittedRow } from '@repo/kit/fitted-row/fitted-row';
import { useSpacing } from '@repo/kit/use-spacing';
import type * as React from 'react';
import { SessionRowItem } from './session-row-item';
import { argoMetaParts, type MetaPart } from './session-row-metadata';
import {
  type MoreEntry,
  pluginEntries,
  MoreCount,
  pluginEntry,
  SessionRowMore,
} from './session-row-more';
import { PluginAccessories } from './session-row-plugin-items';
import type { SessionRowProps } from './session-row-props';

// The Plugins' items after Argo's own, in the Plugins' order; each keeps its own press.
function pluginParts({
  plugins,
  onOpenPluginPage,
}: SessionRowProps): MetaPart[] {
  return (plugins?.items ?? []).map((plugin) => ({
    line: <SessionRowItem key={plugin.key} {...{ plugin, onOpenPluginPage }} />,
    entry: pluginEntry(plugin, onOpenPluginPage),
  }));
}

interface MetaLine {
  parts: MetaPart[];
  // The Plugins' items the Server held back for this Device: "+N" lists them after the line's own.
  held: MoreEntry[];
}

function metaLine(props: SessionRowProps): MetaLine {
  const selected = props.selected ?? false;

  return {
    parts: [...argoMetaParts({ ...props, selected }), ...pluginParts(props)],
    held: heldEntries(props),
  };
}

const heldEntries = ({
  plugins,
  onOpenPluginPage,
}: SessionRowProps): MoreEntry[] =>
  pluginEntries(plugins?.more ?? [], onOpenPluginPage);

// "+N" for the line's parts from `firstHidden` on, then the items held back before the line; measured as its count alone.
const drawMore =
  ({ parts, held }: MetaLine): DrawMore =>
  ({ count, firstHidden, unseen }) =>
    unseen ? (
      <MoreCount count={count} />
    ) : (
      <SessionRowMore
        more={[...parts.slice(firstHidden).map((part) => part.entry), ...held]}
      />
    );

/*
 * A Regular row's meta line: Argo's parts, then the Plugins' items, as many as fit whole; "+N" is always last and lists
 * every one that did not fit, wherever it came from. None when the row has nothing to show.
 */
export function sessionMetaLine(
  props: SessionRowProps,
  sidebar: boolean,
): React.ReactNode {
  const line = metaLine(props);

  // Keep the web press layer in place when Plugin items arrive during a press.
  if (!line.parts.length && !line.held.length)
    return sidebar ? null : undefined;

  return <FittedMetaLine {...line} />;
}

function FittedMetaLine({ parts, held }: MetaLine): React.JSX.Element {
  const gap = useSpacing('--spacing-3');

  return (
    <PluginAccessories className="min-w-0 shrink flex-row items-center">
      <FittedRow
        gap={gap}
        hiddenElsewhere={held.length}
        more={drawMore({ parts, held })}
      >
        {parts.map((part) => part.line)}
      </FittedRow>
    </PluginAccessories>
  );
}
