// What a flow tells Argo: its state changed, so the pages that draw it redraw.
type Changes = { changed: () => void };

// One attempt at a sign-in: whether it is still the current one, and how it records the flow's state.
type HeldAttempt<S> = {
  live: () => boolean;
  settle: (state: S) => S;
};

export type HeldSignIn<S> = {
  state: () => S;
  begin: () => HeldAttempt<S>;
  cancel: () => S;
};

type Held<S> = { state: S; attempt: symbol | null };

// Records a state for the attempt that still counts, and says so, so the pages that draw it redraw.
const settling =
  <S>(held: Held<S>, argo: Changes, mine: symbol) =>
  (state: S): S => {
    if (held.attempt !== mine) return held.state;

    held.state = state;
    argo.changed();

    return state;
  };

function begin<S>(held: Held<S>, argo: Changes): HeldAttempt<S> {
  const mine = Symbol('attempt');

  held.attempt = mine;

  return {
    live: () => held.attempt === mine,
    settle: settling(held, argo, mine),
  };
}

/*
 * The one sign-in a flow holds, and the attempt whose answers still count. A new attempt replaces the one before,
 * whose answers then change nothing; a cancelled flow is idle, and every attempt before it is stale.
 */
export function heldSignIn<S>(argo: Changes, idle: S): HeldSignIn<S> {
  const held: Held<S> = { state: idle, attempt: null };

  return {
    state: () => held.state,
    begin: () => begin(held, argo),
    cancel() {
      held.attempt = null;
      held.state = idle;
      argo.changed();

      return idle;
    },
  };
}
