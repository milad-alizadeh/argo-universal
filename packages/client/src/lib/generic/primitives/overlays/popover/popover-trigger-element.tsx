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

const isNode = (target: EventTarget | null): target is Node =>
  target instanceof Node;

/*
 * A popover opened on hover is already open when a click focuses its trigger. Radix counts that focus as
 * an interaction outside and then skips returning focus to the trigger on close; the trigger is never outside.
 */
export function keepTriggerInside(
  trigger: TriggerElement | undefined,
): (event: Event) => void {
  return (event) => {
    if (isTrigger(trigger, event.target)) event.preventDefault();
  };
}

const isTrigger = (
  trigger: TriggerElement | undefined,
  target: EventTarget | null,
): boolean => isNode(target) && contains(trigger?.current, target);

const contains = (element: Node | null | undefined, target: Node): boolean =>
  element?.contains(target) ?? false;
