import { createContext, useContext, type ReactNode } from 'react';
import type { Place } from '#kit/place';

/*
 * The window's title bar, offered to the shown page on a wide window. A Screen that asks to (`inTitleBar`) draws its
 * title after the window's leading controls and its buttons among the window's trailing ones, as Claude's and Codex's
 * windows do, instead of a heading at the top of its body.
 */
export interface TitleBarPlaces {
  title: Place<ReactNode>;
  actions: Place<ReactNode>;
}

const TitleBarContext = createContext<TitleBarPlaces | undefined>(undefined);

export const TitleBarOffer = TitleBarContext.Provider;

export const useTitleBar = (): TitleBarPlaces | undefined =>
  useContext(TitleBarContext);
