// The window's own history, which the band steps through with Back and Forward; a native window keeps Back in its pages.
export interface WindowHistory {
  canGoBack: boolean;
  canGoForward: boolean;
  back: () => void;
  forward: () => void;
}

export function useWindowHistory(): WindowHistory | null {
  return null;
}
