import { useOptionalSheet } from '@repo/kit/primitives/overlays/sheet';
import { useEffect, useState } from 'react';
import type { ComposerConfigurationProps } from './configuration-types';
import { loadingConfiguration } from './configuration-values';

/*
 * How long the Agent list waits for the Agent it was given. The Server answered in about a third of a second
 * every time it was measured; past this the wait is the Agent's own, and standing on a spinner is worse than
 * going back to a picker that fills in where it stands, which is what it did before (owner, 2026-10-21).
 */
const waitForSettings = 600;

/*
 * The shortest the spinner stands. The settings sometimes land inside a couple of frames, and a mark that
 * appears and goes again in that time reads as a glitch; the owner would rather wait than see it flash
 * (owner, 2026-10-21).
 */
const spinnerFloor = 250;

interface Picked {
  id: string;
  // When the choice was made, which is what the shortest time is counted from.
  at: number;
}

export interface AgentPick {
  // The Agent whose settings the list is waiting for: its row shows a spinner where its mark was.
  pending?: string;
  pick: (id: string) => void;
}

/*
 * Choosing an Agent used to leave for Configure at once and change the Agent on the way, so the page slid while
 * the picker tore its rows down and drew them again — the two heaviest commits of the whole interaction landed
 * mid-slide. The Agent's row now holds the reader on the picker until the new Agent's settings are in, marked
 * pending, and the slide that follows moves a page that is already drawn (owner, 2026-10-21). Only a Sheet slides,
 * so a popover leaves at once.
 */
export function useAgentPick(
  configuration: ComposerConfigurationProps,
  change: (id: string) => void,
): AgentPick {
  const [picked, setPicked] = useState<Picked>();

  useSettled({
    picked,
    settled: !loadingConfiguration(configuration),
    done: () => setPicked(undefined),
  });

  return { pending: picked?.id, pick: useChoosing(change, setPicked) };
}

function useChoosing(
  change: (id: string) => void,
  setPicked: (picked: Picked) => void,
): (id: string) => void {
  const slides = useOptionalSheet() !== undefined;

  return (id) => {
    change(id);

    if (slides) setPicked({ id, at: Date.now() });
  };
}

interface Waiting {
  picked?: Picked;
  settled: boolean;
  done: () => void;
}

// How much longer the list holds: until the settings are in, and never less than the spinner's shortest time.
const holdFor = (picked: Picked, settled: boolean): number =>
  Math.max(
    (settled ? spinnerFloor : waitForSettings) - (Date.now() - picked.at),
    0,
  );

function useSettled({ picked, settled, done }: Waiting): void {
  useEffect(() => {
    if (picked === undefined) return;

    const timer = setTimeout(done, holdFor(picked, settled));

    return (): void => clearTimeout(timer);
  }, [picked, settled, done]);
}
