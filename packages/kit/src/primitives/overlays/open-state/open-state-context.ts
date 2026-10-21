import { type Context, createContext, useContext } from 'react';
import type { OpenState } from './open-state';

type OpenStateContext = [Context<OpenState | null>, () => OpenState];

// Whether an overlay is open, for its parts on every platform; a part drawn outside the overlay throws.
export function createOpenStateContext(overlay: string): OpenStateContext {
  const StateContext = createContext<OpenState | null>(null);

  function useOverlayState(): OpenState {
    const state = useContext(StateContext);

    if (!state) throw new Error(`${overlay} parts render inside a ${overlay}.`);

    return state;
  }

  return [StateContext, useOverlayState];
}
