import {
  createContext,
  use,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

export type SetContentActions = Dispatch<SetStateAction<ReactNode>>;

const PageContentActions = createContext<SetContentActions | undefined>(
  undefined,
);

export const PageContentActionsProvider = PageContentActions;

interface ContentActions {
  actions: ReactNode;
  setActions: SetContentActions;
}

// The Actions a page's content (such as Detail) hands up to the Page header.
export function usePageContentActionsState(): ContentActions {
  const [actions, setActions] = useState<ReactNode>(null);

  return { actions, setActions };
}

/*
 * Hands content Actions to the enclosing Page's header.
 * Returns false outside a Page, where the caller draws them itself.
 */
export function usePageContentActions(actions: ReactNode): boolean {
  const setActions = use(PageContentActions);

  useEffect(() => {
    if (!setActions || !actions) return;

    setActions(actions);

    return (): void => setActions(null);
  }, [setActions, actions]);

  return Boolean(setActions);
}
