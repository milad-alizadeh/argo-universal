import {
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from 'react';

type TriggerElement = RefObject<HTMLButtonElement | null>;

// The trigger's element, so the content can tell its own trigger from the page outside it.
const PopoverTriggerElement = createContext<TriggerElement | undefined>(
  undefined,
);

export function TriggerElementProvider(props: {
  children: ReactNode;
}): ReactNode {
  const element = useRef<HTMLButtonElement>(null);

  return (
    <PopoverTriggerElement value={element}>
      {props.children}
    </PopoverTriggerElement>
  );
}

export const useTriggerElement = (): TriggerElement | undefined =>
  useContext(PopoverTriggerElement);

// Whether the event landed on the trigger or inside it.
const onTrigger = (element: Node | null | undefined, event: Event): boolean =>
  event.target instanceof Node && element?.contains(event.target) === true;

/*
 * A popover opened on hover is already open when a click focuses its trigger. Radix counts that focus as
 * an interaction outside and then skips returning focus to the trigger on close; the trigger is never outside.
 */
export function keepTriggerInside(
  trigger: TriggerElement | undefined,
): (event: Event) => void {
  return (event) => {
    if (onTrigger(trigger?.current, event)) event.preventDefault();
  };
}
