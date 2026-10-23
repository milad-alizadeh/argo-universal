import {
  useState,
  type ContextType,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ActionListHeaderContext,
  orderedGroups,
  prefixedGroups,
  type ActionGroup,
} from '#primitives/actions/action-list';

type Register = NonNullable<ContextType<typeof ActionListHeaderContext>>;

type Registration = Parameters<Register>[1];

export interface PageActions {
  register: Register;
  groups: ActionGroup[];
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

// A Screen's header takes its items as data, as iOS's toolbar does, so its ActionLists register here and the header splits them once.
export function usePageActions(): PageActions {
  const [headers, setHeaders] = useState(noHeaders);
  // Made once, so the ActionLists that read it never re-register because the Screen drew again.
  const [register] = useState(() => headerRegister(setHeaders));

  const ordered = orderedHeaders(headers);

  return {
    register,
    groups: declaredGroups(ordered),
    label: ordered[0]?.[1].label ?? 'More actions',
  };
}

function headerRegister(
  setHeaders: Dispatch<SetStateAction<Headers>>,
): Register {
  return (id, value) => {
    setHeaders((previous) => withHeader(previous, id, value));

    return (): void => setHeaders((previous) => withoutHeader(previous, id));
  };
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

// Each list's ids gain its own prefix, so two lists never share one; danger Actions from every list end up last.
function declaredGroups(headers: [string, Registration][]): ActionGroup[] {
  return orderedGroups(
    headers.flatMap(([id, header]) => prefixedGroups(header.groups, id)),
  );
}
