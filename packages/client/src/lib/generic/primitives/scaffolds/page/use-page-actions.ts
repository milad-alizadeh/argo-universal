import {
  useCallback,
  useState,
  type ContextType,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ActionListHeaderContext,
  type DeclaredAction,
} from '#primitives/actions/action-list';

type Register = NonNullable<ContextType<typeof ActionListHeaderContext>>;

type Registration = Parameters<Register>[1];

interface PageActions {
  register: Register;
  actions: DeclaredAction[];
  label: string;
}

/*
 * Each ActionList keeps the place it first registered at, so the header's order and its overflow label don't move
 * when one list re-registers after its Actions change.
 */
interface Headers {
  registered: ReadonlyMap<string, Registration>;
  order: ReadonlyMap<string, number>;
}

const noHeaders: Headers = { registered: new Map(), order: new Map() };

export function usePageActions(): PageActions {
  const [headers, setHeaders] = useState(noHeaders);
  const register = useHeaderRegister(setHeaders);

  const ordered = orderedHeaders(headers);

  return {
    register,
    actions: declaredActions(ordered),
    label: ordered[0]?.[1].label ?? 'More actions',
  };
}

function useHeaderRegister(
  setHeaders: Dispatch<SetStateAction<Headers>>,
): Register {
  return useCallback<Register>(
    (id, value) => {
      setHeaders((previous) => withHeader(previous, id, value));

      return (): void => setHeaders((previous) => withoutHeader(previous, id));
    },
    [setHeaders],
  );
}

function withHeader(
  previous: Headers,
  id: string,
  value: Registration,
): Headers {
  return {
    registered: new Map(previous.registered).set(id, value),
    order: previous.order.has(id)
      ? previous.order
      : new Map(previous.order).set(id, previous.order.size),
  };
}

function withoutHeader(previous: Headers, id: string): Headers {
  const registered = new Map(previous.registered);
  registered.delete(id);

  return { ...previous, registered };
}

function orderedHeaders(headers: Headers): [string, Registration][] {
  const place = (id: string): number => headers.order.get(id) ?? 0;

  return [...headers.registered].sort(([a], [b]) => place(a) - place(b));
}

function declaredActions(headers: [string, Registration][]): DeclaredAction[] {
  return headers.flatMap(([id, header]) =>
    header.groups.flatMap((group) =>
      group.actions.map((action) => ({ ...action, id: `${id}/${action.id}` })),
    ),
  );
}
