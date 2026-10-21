import {
  useCallback,
  createContext,
  useContext,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

const svgTileLimit = 24;

class DrawingBudget {
  private readonly entries = new Map<string, () => void>();

  public subscribe(id: string, listener: () => void): () => void {
    this.entries.set(id, listener);
    this.notify();

    return () => {
      this.entries.delete(id);
      this.notify();
    };
  }

  public draws(id: string): boolean {
    return [...this.entries.keys()].slice(0, svgTileLimit).includes(id);
  }

  private notify(): void {
    for (const listener of this.entries.values()) listener();
  }
}

const BudgetContext = createContext<DrawingBudget | null>(null);

export const SvgCellVisible = createContext<boolean | null>(null);

// A screen shares one budget across its lists; recycled cells release their place when hidden.
export function SvgBudget({ children }: { children: ReactNode }): ReactNode {
  const inherited = useContext(BudgetContext);
  const [budget] = useState(() => new DrawingBudget());

  return <BudgetContext value={inherited ?? budget}>{children}</BudgetContext>;
}

const noSubscription = (): (() => void) => () => {};

interface CellDrawing {
  budget: DrawingBudget | null;
  visible: boolean;
}

function useCellDrawing(): CellDrawing {
  const inherited = useContext(BudgetContext);
  const cell = useContext(SvgCellVisible);

  return { budget: cell === null ? null : inherited, visible: cell ?? true };
}

export function useSvgDrawing(): boolean {
  const { budget, visible } = useCellDrawing();
  const id = useId();

  const subscribe = useCallback(
    (listener: () => void) =>
      subscribeDrawing({ budget, visible }, id, listener),
    [budget, visible, id],
  );

  return useSyncExternalStore(
    subscribe,
    () => visible && (budget === null || budget.draws(id)),
    () => false,
  );
}

function subscribeDrawing(
  { budget, visible }: CellDrawing,
  id: string,
  listener: () => void,
): () => void {
  return budget && visible ? budget.subscribe(id, listener) : noSubscription();
}
