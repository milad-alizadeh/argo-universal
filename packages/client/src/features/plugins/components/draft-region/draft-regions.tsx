import type { WireNode } from '@repo/contracts/plugins/wire';
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
} from 'react';
import type * as React from 'react';
import {
  DraftPlaceContext,
  type DraftPlace,
} from '../../../../lib/product/plugin-registry/draft-commenting';
import {
  DraftFramedContext,
  DraftSeamContext,
  type DraftSeam,
} from '../../../../lib/product/plugin-registry/draft-seam';
import type { DraftRegions } from '../../hooks/use-draft-regions';
import { DraftRegionFrame } from './draft-region-frame';

type Shown = DraftRegions & {
  // The author is commenting: tags give way to the nodes, which are what a press picks.
  commenting: boolean;
  active: string | null;
  setActive: (id: string | null) => void;
};

const ShownRegions = createContext<Shown | null>(null);

// The frame a region's node draws in: what its tag says and does comes from the App's context, so a step redraws no node.
function ConnectedFrame(props: {
  node: WireNode;
  children?: ReactElement;
}): React.JSX.Element | null {
  const shown = useContext(ShownRegions);
  const drawing = useContext(DraftFramedContext);
  const tag = shown?.tags.find(({ id }) => id === props.node.key);

  if (!shown || !tag) return props.children ?? null;

  const place: DraftPlace = {
    region: tag.id,
    variant: tag.variant,
    label: tag.label,
    letter: tag.letter,
  };

  return (
    <DraftRegionFrame
      tag={tag}
      tagged={!drawing && !shown.commenting}
      active={shown.active === tag.id}
      onActivate={() => shown.setActive(tag.id)}
      onDeactivate={() => shown.setActive(null)}
      onPrevious={() => shown.onStep(tag.id, -1)}
      onNext={() => shown.onStep(tag.id, 1)}
    >
      <DraftPlaceContext value={place}>{props.children}</DraftPlaceContext>
    </DraftRegionFrame>
  );
}

const seamOf = (ids: ReadonlySet<string>, commenting: boolean): DraftSeam => ({
  frames: (node) => ids.has(node.key),
  Frame: ConnectedFrame,
  commenting,
});

/*
 * Marks each region of a dev Plugin's Draft page with its tag, for the Plugin tree drawn inside it. With no
 * regions it draws its children alone, so a shipped Plugin's page is untouched (ADR-0057).
 */
export function DraftRegionsProvider(props: {
  regions: DraftRegions | null;
  // The author is picking nodes to comment on, which a Draft with no regions has too.
  commenting?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  const { regions, commenting = false, children } = props;
  const [active, setActive] = useState<string | null>(null);

  const ids = regions?.tags.map(({ id }) => id).join('\n');

  // One seam while the regions stay the same, so the tree keeps what it drew.
  const seam = useMemo(
    () =>
      ids === undefined && !commenting
        ? null
        : seamOf(new Set(ids?.split('\n')), commenting),
    [ids, commenting],
  );

  return (
    <DraftSeamContext value={seam}>
      <ShownRegions
        value={regions && { ...regions, commenting, active, setActive }}
      >
        {children}
      </ShownRegions>
    </DraftSeamContext>
  );
}
