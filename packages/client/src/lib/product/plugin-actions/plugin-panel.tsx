import { Button } from '#primitives/actions/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '#primitives/overlays/dialog';
import { Sheet, SheetContent } from '#primitives/overlays/sheet';
import {
  answerControl,
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
  const { title } = props.opened.action;
  const dismissible = props.actions.pending === null;
  const content = { accessibilityLabel: title, dismissible };

  return (
    <Dialog open onOpenChange={overlayOpenChange(props)}>
      <DialogContent {...content}>
        <DialogTitle>{title}</DialogTitle>
        <PanelBody {...props} />
      </DialogContent>
    </Dialog>
  );
}

function SheetPanel(props: OpenOverlayProps): React.JSX.Element {
  const { title } = props.opened.action;
  const dismissible = props.actions.pending === null;
  const onOpenChange = overlayOpenChange(props);
  const control = { open: true, label: title, dismissible, onOpenChange };

  return (
    <Sheet {...control}>
      <Sheet.Page name="content" title={title}>
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
        <AnswerButton {...props} />
        <AnswerButton {...props} confirmed />
      </DialogFooter>
    </>
  );
}

type AnswerButtonProps = OpenOverlayProps & { confirmed?: boolean };

function AnswerButton(props: AnswerButtonProps): React.JSX.Element | null {
  const confirmed = Boolean(props.confirmed);

  if (!hasAnswer(props)) return null;
  const { cancel, ...control } = answerControl(props, confirmed);

  return (
    <Button
      {...control}
      variant={cancel ? 'outline' : undefined}
      fullWidth="narrow"
    />
  );
}

function hasAnswer(props: AnswerButtonProps): boolean {
  return !props.confirmed || Boolean(props.opened.action.onConfirm);
}
