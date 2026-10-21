import { useCallback, useEffect, useRef, useState } from 'react';
import { useOptionalSheet } from '#primitives/overlays/sheet';
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
const spinnerFloor = 500;

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
 * mid-slide. The list now keeps the reader until the new Agent's settings are in, and the slide that follows
 * moves a page that is already drawn (owner, 2026-10-21).
 */
export function useAgentPick(
  configuration: ComposerConfigurationProps,
  change: (id: string) => void,
  leave: () => void,
): AgentPick {
  const slides = useOptionalSheet() !== undefined;
  const [picked, setPicked] = useState<Picked>();
  const done = useLeave(leave, setPicked);
  const on = { change, leave, slides, setPicked };

  useSettledLeave(
    { picked, settled: !loadingConfiguration(configuration) },
    done,
  );

  return { pending: picked?.id, pick: picking(on) };
}

interface Picking {
  change: (id: string) => void;
  leave: () => void;
  // Whether leaving the choices is a slide, which is the motion the wait is here to keep clear.
  slides: boolean;
  setPicked: (picked: Picked) => void;
}

const picking =
  (on: Picking) =>
  (id: string): void => {
    on.change(id);

    if (on.slides) on.setPicked({ id, at: Date.now() });
    else on.leave();
  };

// Leaving is the same whether the settings arrived or the wait ran out, and it must not restart the wait.
function useLeave(
  leave: () => void,
  setPicked: (picked?: Picked) => void,
): () => void {
  const latest = useRef(leave);
  useEffect(() => {
    latest.current = leave;
  });

  return useCallback(() => {
    setPicked(undefined);
    latest.current();
  }, [setPicked]);
}

interface Waiting {
  picked?: Picked;
  settled: boolean;
}

// How much longer the list holds: until the settings are in, and never less than the spinner's shortest time.
const leaveIn = (picked: Picked, settled: boolean): number =>
  Math.max(
    (settled ? spinnerFloor : waitForSettings) - (Date.now() - picked.at),
    0,
  );

function useSettledLeave(waiting: Waiting, done: () => void): void {
  const { picked, settled } = waiting;

  useEffect(() => {
    if (picked === undefined) return;

    const timer = setTimeout(done, leaveIn(picked, settled));

    return (): void => clearTimeout(timer);
  }, [picked, settled, done]);
}
