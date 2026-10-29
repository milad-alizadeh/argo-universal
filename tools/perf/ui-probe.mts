import type { UiReadiness } from './ui-readiness.mts';

export interface UiObservation {
  inputAtMs: number;
  firstReadyAtMs: number;
  settledAtMs: number;
  firstReadyMs: number;
  settledMs: number;
}

export type UiEvent = 'pointerdown' | 'wheel' | 'scroll' | 'input' | 'keydown';

interface Probe {
  result: UiObservation | null;
  event: UiEvent;
  readiness: UiReadiness;
  frame: number;
  inputAtMs: number;
  firstReadyAtMs: number;
  previous: string;
  stableFrames: number;
}

declare global {
  interface Window {
    argoPerfProbe?: Probe;
    installUiProbe: (event: UiEvent, readiness: UiReadiness) => void;
    cancelUiProbe: () => void;
  }
}

declare function readyGeometry(readiness: UiReadiness): string;

function cancelUiProbe(): void {
  const probe = window.argoPerfProbe;

  if (!probe) return;
  cancelAnimationFrame(probe.frame);
  document.removeEventListener(probe.event, startUiProbe, true);
}

function finishUiProbe(probe: Probe): void {
  const settledAtMs = performance.now();
  const { inputAtMs, firstReadyAtMs } = probe;

  probe.result = {
    inputAtMs,
    firstReadyAtMs,
    settledAtMs,
    firstReadyMs: firstReadyAtMs - inputAtMs,
    settledMs: settledAtMs - inputAtMs,
  };
  cancelUiProbe();
}

function stableCount(probe: Probe, signature: string): number {
  return signature === probe.previous ? probe.stableFrames + 1 : 1;
}

function trackGeometry(probe: Probe, signature: string): void {
  if (signature) {
    if (Number.isNaN(probe.firstReadyAtMs))
      probe.firstReadyAtMs = performance.now();
    probe.stableFrames = stableCount(probe, signature);
  } else probe.stableFrames = 0;
  probe.previous = signature;
}

function checkUiProbe(): void {
  const probe = window.argoPerfProbe;

  if (!probe) return;
  trackGeometry(probe, readyGeometry(probe.readiness));

  // Ready geometry must be unchanged for three consecutive rendering opportunities.
  if (probe.stableFrames >= 3) finishUiProbe(probe);
  else probe.frame = requestAnimationFrame(checkUiProbe);
}

function startUiProbe(): void {
  const probe = window.argoPerfProbe;

  if (!probe || !Number.isNaN(probe.inputAtMs)) return;
  probe.inputAtMs = performance.now();
  probe.frame = requestAnimationFrame(checkUiProbe);
}

function installUiProbe(event: UiEvent, readiness: UiReadiness): void {
  cancelUiProbe();
  window.argoPerfProbe = {
    result: null,
    event,
    readiness,
    frame: 0,
    inputAtMs: Number.NaN,
    firstReadyAtMs: Number.NaN,
    previous: '',
    stableFrames: 0,
  };
  document.addEventListener(event, startUiProbe, true);
}

export const probeScript = [
  cancelUiProbe,
  finishUiProbe,
  trackGeometry,
  stableCount,
  checkUiProbe,
  startUiProbe,
  installUiProbe,
]
  .map(String)
  .join('\n');
