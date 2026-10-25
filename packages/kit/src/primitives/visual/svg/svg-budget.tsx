import {
  useCallback,
  createContext,
  useContext,
  useId,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// Chromium keeps 16 live WebGL contexts a page and Skia takes one per chart, so Skia tiles stop short of it.
const tileLimits = { svg: 24, skia: 14 };

type DrawingKind = keyof typeof tileLimits;

type Budgets = Record<DrawingKind, DrawingBudget>;

class DrawingBudget {
  private readonly entries = new Map<string, () => void>();

  public constructor(private readonly limit: number) {}

  public subscribe(id: string, listener: () => void): () => void {
    this.entries.set(id, listener);
    this.notify();

    return () => {
      this.entries.delete(id);
      this.notify();
    };
  }

  public draws(id: string): boolean {
    return [...this.entries.keys()].slice(0, this.limit).includes(id);
  }

  private notify(): void {
    for (const listener of this.entries.values()) listener();
  }
}

const BudgetContext = createContext<Budgets | null>(null);

const newBudgets = (): Budgets => ({
  svg: new DrawingBudget(tileLimits.svg),
  skia: new DrawingBudget(tileLimits.skia),
});

export const SvgCellVisible = createContext<boolean | null>(null);

// A screen shares one budget across its lists; recycled cells release their place when hidden.
export function SvgBudget({ children }: { children: ReactNode }): ReactNode {
  const inherited = useContext(BudgetContext);
  const [budget] = useState(newBudgets);

  return <BudgetContext value={inherited ?? budget}>{children}</BudgetContext>;
}

const noSubscription = (): (() => void) => () => {};

interface CellDrawing {
  budget: DrawingBudget | null;
  visible: boolean;
}

const budgetFor = (
  budgets: Budgets | null,
  kind: DrawingKind,
): DrawingBudget | null => budgets?.[kind] ?? null;

function useCellDrawing(kind: DrawingKind): CellDrawing {
  const inherited = useContext(BudgetContext);
  const cell = useContext(SvgCellVisible);

  return {
    budget: cell === null ? null : budgetFor(inherited, kind),
    visible: cell ?? true,
  };
}

export function useSvgDrawing(kind: DrawingKind = 'svg'): boolean {
  const { budget, visible } = useCellDrawing(kind);
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
