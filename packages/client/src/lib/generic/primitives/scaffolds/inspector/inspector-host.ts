import { createContext } from 'react';
import {
  type ClaimStore,
  createClaimStore,
  useClaimed,
} from '#lib/generic/claim-store';
import type { InspectorProps } from './inspector-props';

/*
 * The App Frame's Inspector column, flush with the window's right edge, offered to the shown page on a wide window:
 * the page's Inspector draws there, and the Frame gives the page the rest of the width. Null while a claim has
 * not shown its Inspector yet.
 */
export type InspectorHost = ClaimStore<InspectorProps | null>;

export const createInspectorHost = (): InspectorHost =>
  createClaimStore<InspectorProps | null>(null);

// Offered by the App to the focused page; absent in previews, where a wide Inspector draws its column in place.
export const InspectorHostContext = createContext<InspectorHost | undefined>(
  undefined,
);

// The Inspector the shown page holds the column with, if any.
export function useHostedInspector(host: InspectorHost): InspectorProps | null {
  return useClaimed(host) ?? null;
}
