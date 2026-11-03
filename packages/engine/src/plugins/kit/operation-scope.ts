type RunInOperation = <T>(id: number, run: () => T) => T;

export type OperationScope = {
  run: RunInOperation;
  current: () => number | null;
};

let scope: OperationScope = { run: (_id, run) => run(), current: () => null };

// The worker's AsyncLocalStorage keeps the Operation an invocation answers across the handler's awaits.
export function configureOperationScope(next: OperationScope): void {
  scope = next;
}

export const inOperation: RunInOperation = (id, run) => scope.run(id, run);

// The invocation the running code answers, or null outside an Operation's handler.
export const currentOperation = (): number | null => scope.current();
