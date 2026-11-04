type RunIn = <T>(id: number, run: () => T) => T;

// One kind of call the running code may be inside: an Operation's invocation or a Loader page's draw.
export type IdScope = {
  run: RunIn;
  current: () => number | null;
};

// The worker's scopes, which keep the invocation or draw across the Plugin code's awaits.
export type CallScopes = { operation: IdScope; draw: IdScope };

const unscoped: IdScope = { run: (_id, run) => run(), current: () => null };

let scopes: CallScopes = { operation: unscoped, draw: unscoped };

// The worker's AsyncLocalStorage keeps each scope across a handler's or a Loader's awaits.
export function configureCallScopes(next: CallScopes): void {
  scopes = next;
}

export const inOperation: RunIn = (id, run) => scopes.operation.run(id, run);

// The invocation the running code answers, or null outside an Operation's handler.
export const currentOperation = (): number | null => scopes.operation.current();

// What a draw's Loader, paged list and Render call runs for that draw, so the Server scopes it by the draw.
export const inDraw: RunIn = (id, run) => scopes.draw.run(id, run);
