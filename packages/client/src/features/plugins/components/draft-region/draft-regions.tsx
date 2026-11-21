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
  DraftSeamContext,
  type DraftSeam,
} from '../../../../lib/product/plugin-registry/draft-seam';
import type { DraftRegions } from '../../hooks/use-draft-regions';
import { DraftRegionFrame } from './draft-region-frame';

type Shown = DraftRegions & {
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
  const tag = shown?.tags.find(({ id }) => id === props.node.key);

  if (!shown || !tag) return props.children ?? null;

  return (
    <DraftRegionFrame
      tag={tag}
      active={shown.active === tag.id}
      onActivate={() => shown.setActive(tag.id)}
      onDeactivate={() => shown.setActive(null)}
      onPrevious={() => shown.onStep(tag.id, -1)}
      onNext={() => shown.onStep(tag.id, 1)}
    >
      {props.children}
    </DraftRegionFrame>
  );
}

const seamOf = (ids: ReadonlySet<string>): DraftSeam => ({
  frames: (node) => ids.has(node.key),
  Frame: ConnectedFrame,
});

/*
 * Marks each region of a dev Plugin's Draft page with its tag, for the Plugin tree drawn inside it. With no
 * regions it draws its children alone, so a shipped Plugin's page is untouched (ADR-0057).
 */
export function DraftRegionsProvider(props: {
  regions: DraftRegions | null;
  children: React.ReactNode;
}): React.JSX.Element {
  const { regions, children } = props;
  const [active, setActive] = useState<string | null>(null);

  const ids = regions?.tags.map(({ id }) => id).join('\n');

  // One seam while the regions stay the same, so the tree keeps what it drew.
  const seam = useMemo(
    () => (ids === undefined ? null : seamOf(new Set(ids.split('\n')))),
    [ids],
  );

  return (
    <DraftSeamContext value={seam}>
      <ShownRegions value={regions && { ...regions, active, setActive }}>
        {children}
      </ShownRegions>
    </DraftSeamContext>
  );
}
