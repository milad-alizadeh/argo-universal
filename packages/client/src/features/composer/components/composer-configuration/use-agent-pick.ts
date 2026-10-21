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
  const [pending, setPending] = useState<string>();
  const done = useLeave(leave, setPending);

  useSettledLeave(
    { pending, settled: !loadingConfiguration(configuration) },
    done,
  );

  return { pending, pick: picking({ change, leave, slides, setPending }) };
}

interface Picking {
  change: (id: string) => void;
  leave: () => void;
  // Whether leaving the choices is a slide, which is the motion the wait is here to keep clear.
  slides: boolean;
  setPending: (pending: string) => void;
}

const picking =
  (on: Picking) =>
  (id: string): void => {
    on.change(id);

    if (on.slides) on.setPending(id);
    else on.leave();
  };

// Leaving is the same whether the settings arrived or the wait ran out, and it must not restart the wait.
function useLeave(
  leave: () => void,
  setPending: (pending?: string) => void,
): () => void {
  const latest = useRef(leave);
  useEffect(() => {
    latest.current = leave;
  });

  return useCallback(() => {
    setPending(undefined);
    latest.current();
  }, [setPending]);
}

interface Waiting {
  pending?: string;
  settled: boolean;
}

function useSettledLeave(waiting: Waiting, done: () => void): void {
  const { pending, settled } = waiting;

  useEffect(() => {
    if (pending === undefined) return;

    if (settled) return done();

    const timer = setTimeout(done, waitForSettings);

    return (): void => clearTimeout(timer);
  }, [pending, settled, done]);
}
