import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { sheetCommands } from './form-sheet-commands';
import type {
  FormSheetRoutes,
  SheetCommands,
  SheetPage,
  SheetState,
} from './form-sheet-props';

const CommandsContext = createContext<SheetCommands | undefined>(undefined);

const StateContext = createContext<SheetState | undefined>(undefined);

const PageContext = createContext<
  Pick<SheetCommands, 'push' | 'back'> | undefined
>(undefined);

export const SheetNavigationProvider = PageContext.Provider;

type ProviderProps = { routes?: FormSheetRoutes; children: ReactNode };

export function FormSheetProvider(props: ProviderProps): ReactElement {
  const [sheet, setSheet] = useState<SheetState>();

  const commands = useMemo(
    () => createCommands(props.routes, setSheet),
    [props.routes],
  );

  return (
    <CommandsContext.Provider value={commands}>
      <StateContext.Provider value={sheet}>
        {props.children}
      </StateContext.Provider>
    </CommandsContext.Provider>
  );
}

function createCommands(
  routes: FormSheetRoutes | undefined,
  setSheet: (sheet: SheetState | undefined) => void,
): SheetCommands | undefined {
  if (!routes) return undefined;
  let current: SheetState | undefined;

  const publish = (sheet?: SheetState): void => {
    current = sheet;
    setSheet(sheet);
  };

  return sheetCommands({ routes, read: () => current, publish });
}

export function useFormSheetCommands(): SheetCommands | undefined {
  return useContext(CommandsContext);
}

export function useFormSheetState(): SheetState | undefined {
  return useContext(StateContext);
}

export function useSheetNavigation():
  | { push: (page: SheetPage) => void; back: () => void }
  | undefined {
  return useContext(PageContext);
}
