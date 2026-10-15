import {
  cloneElement,
  useId,
  useRef,
  useState,
  type ReactElement,
} from 'react';
import {
  Sheet,
  useOptionalSheet,
  type SheetNavigation,
} from '#primitives/overlays/sheet';
import type { PickerProps } from './picker-props';
import { PickerSearchList } from './picker-search-list';

type Props<Value extends string> = PickerProps<Value> & {
  trigger: ReactElement<{ onPress?: () => void }>;
};

// Choice belongs to the field; presentation and navigation belong to Sheet.
export function PickerSheet<Value extends string>(
  props: Props<Value>,
): ReactElement {
  const presentation = usePickerPresentation(props);

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

function usePickerPresentation<Value extends string>(
  props: PickerProps<Value>,
): Presentation {
  const parent = useOptionalSheet();
  const name = useId();
  const [open, setOpen] = useState(false);
  const completion = useCompletion(props.onBlur);

  const close = closeChoices(setOpen, completion);

  return {
    parent,
    open,
    close,
    show: showChoices(props, { parent, name, completion, setOpen }),
  };
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

type Completion = { begin: () => void; finish: () => void };

type Opening = {
  parent?: SheetNavigation;
  name: string;
  completion: Completion;
  setOpen: (open: boolean) => void;
};

function showChoices<Value extends string>(
  props: PickerProps<Value>,
  opening: Opening,
): () => void {
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

function useCompletion(onBlur?: () => void): Completion {
  const active = useRef(false);

  return {
    begin: (): void => {
      active.current = true;
    },
    finish: (): void => {
      if (!active.current) return;
      active.current = false;
      onBlur?.();
    },
  };
}

function pushChoices<Value extends string>(
  props: PickerProps<Value>,
  parent: SheetNavigation,
  completion: { name: string; onExit: () => void },
): void {
  parent.push({
    ...completion,
    title: props.label,
    contentScrolls: true,
    children: <PickerSearchList {...props} onClose={parent.back} />,
  });
}

function StandaloneChoices<Value extends string>(
  props: Props<Value> & Presentation,
): ReactElement {
  return (
    <Sheet {...standaloneProps(props)}>
      <Sheet.Page name="options" title={props.label}>
        {props.open && <PickerSearchList {...props} onClose={props.close} />}
      </Sheet.Page>
    </Sheet>
  );
}

function standaloneProps(
  props: Pick<Props<string>, 'label' | 'trigger'> & Presentation,
): Omit<React.ComponentProps<typeof Sheet>, 'children'> {
  return {
    open: props.open,
    trigger: props.trigger,
    label: props.label,
    detents: ['large'],
    contentScrolls: true,
    onOpenChange: (next): void => {
      if (next) props.show();
      else props.close();
    },
  };
}
