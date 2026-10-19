import { createContext, useContext, useEffect } from 'react';

/*
 * The native sidebar List's selection (List/index.d.ts: `selection`, `onSelectionChange`): each
 * selectable row tags itself (tag.d.ts), says what choosing it does, and whether its page is open.
 */
export interface SidebarSelection {
  choices: Map<string, () => void>;
  show: (tag?: string) => void;
}

export const SidebarSelectionContext = createContext<SidebarSelection | null>(
  null,
);

// Whether the row sits in a selectable native sidebar, which then chooses it instead of a button.
export function useSidebarSelection(
  tag: string,
  selected: boolean,
  choose: (() => void) | undefined,
): boolean {
  const selection = useContext(SidebarSelectionContext);

  useEffect(() => offerChoice(selection, tag, choose));

  useEffect(
    () => showWhileSelected(selection, tag, selected),
    [selection, tag, selected],
  );

  return selection !== null && choose !== undefined;
}

type Cleanup = (() => void) | void;

function offerChoice(
  selection: SidebarSelection | null,
  tag: string,
  choose: (() => void) | undefined,
): Cleanup {
  if (!selection || !choose) return;

  selection.choices.set(tag, choose);

  return (): void => {
    selection.choices.delete(tag);
  };
}

function showWhileSelected(
  selection: SidebarSelection | null,
  tag: string,
  selected: boolean,
): Cleanup {
  if (!selection || !selected) return;

  selection.show(tag);

  return (): void => selection.show();
}
