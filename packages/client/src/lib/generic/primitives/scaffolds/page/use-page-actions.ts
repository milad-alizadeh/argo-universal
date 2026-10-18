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

type Headers = ReadonlyMap<string, Registration>;

export function usePageActions(): PageActions {
  const [headers, setHeaders] = useState<Headers>(() => new Map());
  const register = useHeaderRegister(setHeaders);

  return {
    register,
    actions: declaredActions(headers),
    label: headers.values().next().value?.label ?? 'More actions',
  };
}

function useHeaderRegister(
  setHeaders: Dispatch<SetStateAction<Headers>>,
): Register {
  return useCallback<Register>(
    (id, value) => {
      setHeaders((previous) => new Map(previous).set(id, value));

      return (): void => setHeaders((previous) => withoutHeader(previous, id));
    },
    [setHeaders],
  );
}

function withoutHeader(
  previous: ReadonlyMap<string, Registration>,
  id: string,
): ReadonlyMap<string, Registration> {
  const headers = new Map(previous);
  headers.delete(id);

  return headers;
}

function declaredActions(
  headers: ReadonlyMap<string, Registration>,
): DeclaredAction[] {
  return [...headers].flatMap(([id, header]) =>
    header.groups.flatMap((group) =>
      group.actions.map((action) => ({ ...action, id: `${id}/${action.id}` })),
    ),
  );
}
