import { useEffect, useId, useRef } from 'react';
import type { FormSheetProps, SheetCommands } from './form-sheet-props';

export function RoutedFormSheet(
  props: FormSheetProps & { commands: SheetCommands },
): null {
  const owner = useId();
  const latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  useEffect(
    () => present(latest.current, owner),
    [owner, props.commands, props.open],
  );
  useEffect(() => props.commands.update(owner, props), [owner, props]);

  return null;
}

function present(
  props: FormSheetProps & { commands: SheetCommands },
  owner: string,
): () => void {
  if (props.open) props.commands.show(owner, props);

  return (): void => props.commands.hide(owner);
}
