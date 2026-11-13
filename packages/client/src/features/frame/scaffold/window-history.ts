// One way through the window's history: whether it leads anywhere, and the move.
export interface HistoryStep {
  enabled: boolean;
  go: () => void;
}

// The window's own history, which the band steps through with Back and Forward; a native window keeps Back in its pages.
export interface WindowHistory {
  back: HistoryStep;
  forward: HistoryStep;
}

export function useWindowHistory(): WindowHistory | null {
  return null;
}
