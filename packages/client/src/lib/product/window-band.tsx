import { createContext, use, type ReactNode } from 'react';
import {
  type ClaimStore,
  createClaimStore,
  useClaim,
} from '#lib/generic/claim-store';
import { useWide } from '#lib/generic/use-wide/use-wide';
import { useScreenFocused } from './navigation/navigation';

// The focused page supplies its identity and summary; the window owns their placement and pane controls.
export interface WindowBandContent {
  title: ReactNode;
  menu?: ReactNode;
  workbench?: ReactNode;
  onStageToggle?: () => void;
}

export type WindowBandHost = ClaimStore<WindowBandContent | null>;

export const createWindowBandHost = (): WindowBandHost =>
  createClaimStore<WindowBandContent | null>(null);

export const WindowBandHostContext = createContext<WindowBandHost | undefined>(
  undefined,
);

// A retained page gives up the band's claim while another page is focused. A phone keeps its own native header.
export function WindowBand({
  children,
  ...content
}: WindowBandContent & { children?: ReactNode }): ReactNode {
  const host = use(WindowBandHostContext);
  const focused = useScreenFocused();
  const wide = useWide();
  useClaim(focused && wide ? host : undefined, content);

  return host && wide ? null : children;
}
