import type { SkImage } from '@shopify/react-native-skia';
import type * as React from 'react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useSharedValue } from 'react-native-reanimated';
import { OrbBoundary } from './orb-boundary';
import {
  displaced,
  type OrbHolder,
  withHolder,
  withoutHolder,
} from './orb-holders';
import { OrbDriverLoader } from './orb-loader';
import { useOrbSeat } from './orb-seat';
import { type OrbAsks, type OrbShare, OrbShareContext } from './orb-share';

interface SharedOrb {
  share: OrbShare;
  // The look the drawing takes; none while no orb shows it and none has for a moment.
  look: OrbHolder | undefined;
}

function useHolders(): [OrbHolder[], OrbAsks] {
  const [holders, setHolders] = useState<OrbHolder[]>([]);

  const asks = useMemo<OrbAsks>(
    () => ({
      join: (holder): void => setHolders((held) => withHolder(held, holder)),
      leave: (id): void => setHolders((held) => withoutHolder(held, id)),
    }),
    [],
  );

  return [holders, asks];
}

// How long the drawing outlives the last orb that showed it.
const lingerMilliseconds = 1000;

type Look = OrbHolder | undefined;

// Lets go of the last look once no orb has shown the drawing for a moment.
function useLetGo(look: Look, last: Look, setLast: (look: Look) => void): void {
  useEffect(() => {
    if (look || !last) return;

    const timer = setTimeout(() => setLast(undefined), lingerMilliseconds);

    return (): void => clearTimeout(timer);
  }, [last, look, setLast]);
}

/*
 * The look asked for last, kept for a moment after its orb leaves. A row that leaves before the next
 * one mounts, or scrolls away and back, then finds the drawing where it left it; after longer with
 * no orb the drawing stops, and the next orb fades in.
 */
function useLingeringLook(look: Look): Look {
  const [last, setLast] = useState(look);
  const shown = look ?? last;

  if (shown !== last) setLast(shown);

  useLetGo(look, last, setLast);

  return shown;
}

function useSharedOrb(): SharedOrb {
  const image = useSharedValue<SkImage | null>(null);
  const seat = useOrbSeat();
  const [holders, asks] = useHolders();
  const look = useLingeringLook(holders.at(-1));

  const share = useMemo<OrbShare>(
    () => ({ ...asks, image, seat, displaced: displaced(holders) }),
    [asks, holders, image, seat],
  );

  return { share, look };
}

// Drawn only while an orb shows it. A window that cannot draw an orb draws none here either.
function SharedDrawing({ share, look }: SharedOrb): React.JSX.Element | null {
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
  const shared = useSharedOrb();

  return (
    <OrbShareContext value={shared.share}>
      {children}
      <SharedDrawing {...shared} />
    </OrbShareContext>
  );
}
