import type {
  FormSheetProps,
  SheetCommands,
  SheetOwner,
  SheetPage,
} from './form-sheet-types';

export function sheetCommands(owner: SheetOwner): SheetCommands {
  return {
    show: (id, props): void => show(owner, id, props),
    update: (id, props): void => update(owner, id, props),
    hide: (id): void => hide(owner, id),
    push: (page): void => push(owner, page),
    back: (): void => back(owner),
    closed: (): void => closed(owner),
    canDismiss: (): boolean => owner.read()?.props.dismissible !== false,
  };
}

function show(owner: SheetOwner, id: string, props: FormSheetProps): void {
  owner.publish({ owner: id, props });
  owner.routes.present();
}

function update(owner: SheetOwner, id: string, props: FormSheetProps): void {
  const current = owner.read();

  if (current?.owner === id) owner.publish({ ...current, props });
}

function hide(owner: SheetOwner, id: string): void {
  const current = owner.read();

  if (!current || current.owner !== id) return;
  const props = current.props;
  owner.publish();
  owner.routes.dismiss();
  notifyClosed(props);
}

function push(owner: SheetOwner, page: SheetPage): void {
  const current = owner.read();

  if (!current) return;
  owner.publish({ ...current, page });
  owner.routes.push();
}

function back(owner: SheetOwner): void {
  const current = owner.read();

  if (!current) return;
  owner.publish({ ...current, page: undefined });
  owner.routes.back();
}

function closed(owner: SheetOwner): void {
  const current = owner.read();

  if (!current) return;
  owner.publish();
  current.props.onOpenChange(false);
  current.props.onClosed?.();
}

function notifyClosed(props: Pick<FormSheetProps, 'onClosed'>): void {
  props.onClosed?.();
}
