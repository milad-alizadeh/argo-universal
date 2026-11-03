import type {
  LoaderInput,
  PageTo,
} from '@repo/contracts/plugins/loader-page-api';
import type { PageState } from '@repo/contracts/plugins/page-address';
import type { OperationCall, PluginEvent } from '@repo/contracts/plugins/wire';

type DrawEvent = Extract<PluginEvent, { type: 'draw' }>;

// The address's Page state over the page's defaults; the context is the one the App opened the page for.
export function inputOf<State extends PageState>(
  defaults: State | undefined,
  params: Record<string, string>,
  { pageState, projectId, sessionId }: DrawEvent,
): LoaderInput<State> {
  return Object.freeze({
    params: Object.freeze(params),
    state: Object.freeze(stateOf(defaults, pageState)),
    context: Object.freeze({ serverDevice: false, projectId, sessionId }),
  });
}

// The App's Page state is input: a key the defaults name must hold a value of the default's type.
function stateOf<State extends PageState>(
  defaults: State | undefined,
  given: PageState,
): State {
  const state = { ...defaults, ...given };

  if (!fitsDefaults<State>(state, defaults ?? {}))
    throw new Error('This Page state does not fit the page');

  return state;
}

const fitsDefaults = <State extends PageState>(
  state: PageState,
  defaults: PageState,
): state is State =>
  Object.entries(defaults).every(
    ([key, fallback]) => typeof state[key] === typeof fallback,
  );

export const pageTo = <State extends PageState>(): PageTo<State> =>
  Object.freeze({
    go: (path) => ({ action: 'navigate', path }),
    set: (change) => ({ pageState: setValues(change) }),
    bind: (key) => ({ bind: key }),
    run: (operation, args, options = {}) =>
      operationCall({ operation, args: { ...args } }, options.optimistic),
  });

// A change leaves out the keys it does not set.
const setValues = (change: Partial<PageState>): PageState =>
  Object.fromEntries(
    Object.entries(change).filter(
      (entry): entry is [string, PageState[string]] => entry[1] !== undefined,
    ),
  );

function operationCall(
  call: OperationCall,
  optimistic: OperationCall['optimistic'],
): OperationCall {
  if (optimistic) return { ...call, optimistic };

  return call;
}
