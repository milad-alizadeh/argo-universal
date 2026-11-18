import type { SkImage } from '@shopify/react-native-skia';
import type * as React from 'react';
import { type ReactNode, useMemo, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { OrbBoundary } from './orb-boundary';
import { joined, left, type OrbHolder } from './orb-holders';
import { OrbDriverLoader } from './orb-loader';
import { useOrbSeat } from './orb-seat';
import { type OrbAsks, type OrbShare, OrbShareContext } from './orb-share';

interface Shared {
  share: OrbShare;
  // The look asked for last, while an orb that continues is on screen.
  look: OrbHolder | undefined;
}

function useHolders(): [OrbHolder[], OrbAsks] {
  const [holders, setHolders] = useState<OrbHolder[]>([]);

  const asks = useMemo<OrbAsks>(
    () => ({
      join: (holder): void => setHolders((held) => joined(held, holder)),
      leave: (id): void => setHolders((held) => left(held, id)),
    }),
    [],
  );

  return [holders, asks];
}

function useShared(): Shared {
  const image = useSharedValue<SkImage | null>(null);
  const seat = useOrbSeat();
  const [holders, asks] = useHolders();
  const look = holders.at(-1);
  const holder = look?.id;

  const share = useMemo<OrbShare>(
    () => ({ ...asks, image, seat, holder }),
    [asks, holder, image, seat],
  );

  return { share, look };
}

// Drawn only while an orb shows it. A window that cannot draw an orb draws none here either.
function SharedDrawing({ share, look }: Shared): React.JSX.Element | null {
  if (!look) return null;

  return (
    <OrbBoundary fallback={null}>
      <OrbDriverLoader
        image={share.image}
        seat={share.seat}
        state={look.state}
        size={look.size}
      />
    </OrbBoundary>
  );
}

/*
 * One orb for everything under it. An `Orb` that `continues` shows this orb's drawing instead of
 * its own, so when one row's orb gives way to another's the drawing carries on: the same clock, and
 * a morph from the old state's shape to the new. It fades in when the first such orb appears.
 */
export function OrbContinuity({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const shared = useShared();

  return (
    <OrbShareContext value={shared.share}>
      {children}
      <SharedDrawing {...shared} />
    </OrbShareContext>
  );
}
