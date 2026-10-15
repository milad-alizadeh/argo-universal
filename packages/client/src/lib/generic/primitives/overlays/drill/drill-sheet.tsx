import {
  cloneElement,
  useId,
  useLayoutEffect,
  useState,
  type ReactElement,
} from 'react';
import {
  Sheet,
  useOptionalSheet,
  type SheetNavigation,
} from '#primitives/overlays/sheet';
import { useCompletion, type Completion } from './drill-completion';
import type { DrillProps } from './drill-props';

type Props = DrillProps & { trigger: NonNullable<DrillProps['trigger']> };

// Choice belongs to the field; presentation and navigation belong to Sheet.
export function DrillSheet(props: Props): ReactElement {
  const presentation = useDrillPresentation(props);

  if (presentation.parent)
    return cloneElement(props.trigger, { onPress: presentation.show });

  return <StandaloneChoices {...props} {...presentation} />;
}

type Presentation = {
  parent?: SheetNavigation;
  open: boolean;
  show: () => void;
  close: () => void;
};

function useDrillPresentation(props: DrillProps): Presentation {
  const parent = useOptionalSheet();
  const name = useId();
  const [open, setOpen] = useState(false);
  const completion = useCompletion(props.onClose);
  useLiveDestination(props, { parent, name, onExit: completion.finish });

  const close = closeChoices(setOpen, completion);

  return {
    parent,
    open,
    close,
    show: showChoices(props, { parent, name, completion, setOpen }),
  };
}

type DestinationOwner = {
  parent?: SheetNavigation;
  name: string;
  onExit: () => void;
};

function useLiveDestination(props: DrillProps, owner: DestinationOwner): void {
  const { parent, name, onExit } = owner;
  const { title, contentScrolls, children } = props;

  useLayoutEffect(() => {
    if (!parent) return;
    parent.update({
      name,
      title,
      contentScrolls,
      onExit,
      children: children(parent.back),
    });
  }, [parent, name, onExit, title, contentScrolls, children]);
}

function closeChoices(
  setOpen: (open: boolean) => void,
  completion: Completion,
): () => void {
  return (): void => {
    setOpen(false);
    completion.finish();
  };
}

type Opening = {
  parent?: SheetNavigation;
  name: string;
  completion: Completion;
  setOpen: (open: boolean) => void;
};

function showChoices(props: DrillProps, opening: Opening): () => void {
  return (): void => {
    if (props.disabled) return;
    opening.completion.begin();

    if (opening.parent)
      pushChoices(props, opening.parent, {
        name: opening.name,
        onExit: opening.completion.finish,
      });
    else opening.setOpen(true);
  };
}

function pushChoices(
  props: DrillProps,
  parent: SheetNavigation,
  completion: { name: string; onExit: () => void },
): void {
  parent.push({
    ...completion,
    title: props.title,
    contentScrolls: props.contentScrolls,
    children: props.children(parent.back),
  });
}

function StandaloneChoices(props: Props & Presentation): ReactElement {
  return (
    <Sheet {...standaloneProps(props)}>
      <Sheet.Page name="options" title={props.title}>
        {props.open && props.children(props.close)}
      </Sheet.Page>
    </Sheet>
  );
}

type StandaloneProps = Pick<
  DrillProps,
  'label' | 'title' | 'trigger' | 'contentScrolls'
> &
  Presentation;

function standaloneProps(
  props: StandaloneProps,
): Omit<React.ComponentProps<typeof Sheet>, 'children'> {
  return {
    open: props.open,
    trigger: props.trigger,
    label: props.title,
    detents: ['large'],
    contentScrolls: props.contentScrolls,
    onOpenChange: changePresentation(props),
  };
}

function changePresentation(props: Presentation): (next: boolean) => void {
  return (next): void => {
    if (next) props.show();
    else props.close();
  };
}
