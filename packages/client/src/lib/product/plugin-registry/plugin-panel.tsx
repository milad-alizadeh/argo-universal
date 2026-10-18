import { Button } from '#primitives/actions/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '#primitives/overlays/dialog';
import { Sheet, SheetContent } from '#primitives/overlays/sheet';
import {
  overlayFinish,
  overlayOpenChange,
  type OpenOverlayProps,
} from './plugin-overlay-types';

export function PluginPanel(props: OpenOverlayProps): React.JSX.Element {
  return props.opened.action.action === 'sheet' ? (
    <SheetPanel {...props} />
  ) : (
    <DialogPanel {...props} />
  );
}

function DialogPanel(props: OpenOverlayProps): React.JSX.Element {
  return (
    <Dialog open onOpenChange={overlayOpenChange(props)}>
      <DialogPanelContent {...props} />
    </Dialog>
  );
}

function DialogPanelContent(props: OpenOverlayProps): React.JSX.Element {
  return (
    <DialogContent
      accessibilityLabel={props.opened.action.title}
      dismissible={props.actions.pending === null}
    >
      <DialogTitle>{props.opened.action.title}</DialogTitle>
      <PanelBody {...props} />
    </DialogContent>
  );
}

function SheetPanel(props: OpenOverlayProps): React.JSX.Element {
  const action = props.opened.action;

  return (
    <Sheet {...sheetPresentation(props)}>
      <Sheet.Page name="content" title={action.title}>
        <SheetContent>
          <PanelBody {...props} />
        </SheetContent>
      </Sheet.Page>
    </Sheet>
  );
}

function PanelBody(props: OpenOverlayProps): React.JSX.Element {
  return (
    <>
      {props.renderContent(props.opened)}
      <DialogFooter>
        <CancelButton {...props} />
        <ConfirmButton {...props} />
      </DialogFooter>
    </>
  );
}

function CancelButton(props: OpenOverlayProps): React.JSX.Element {
  const action = props.opened.action;

  const control = {
    label: action.cancelLabel ?? 'Cancel',
    loading: props.actions.pending === 'onDismiss',
    disabled: props.actions.pending !== null,
    onPress: (): void => overlayFinish(props)(false),
  };

  return <Button {...control} variant="outline" fullWidth="narrow" />;
}

function ConfirmButton(props: OpenOverlayProps): React.JSX.Element | null {
  const action = props.opened.action;

  if (!action.onConfirm) return null;

  const control = {
    label: action.confirmLabel ?? 'Confirm',
    loading: props.actions.pending === 'onConfirm',
    disabled: props.actions.pending !== null,
    onPress: (): void => overlayFinish(props)(true),
  };

  return <Button {...control} fullWidth="narrow" />;
}

function sheetPresentation(
  props: OpenOverlayProps,
): Pick<
  React.ComponentProps<typeof Sheet>,
  'open' | 'label' | 'onOpenChange' | 'dismissible'
> {
  return {
    open: true,
    label: props.opened.action.title,
    onOpenChange: overlayOpenChange(props),
    dismissible: props.actions.pending === null,
  };
}
