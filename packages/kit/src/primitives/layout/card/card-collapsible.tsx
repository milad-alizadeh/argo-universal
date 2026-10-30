import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/layout/collapsible';
import { useOpenState } from '#primitives/overlays/open-state';
import { Chevron } from '#primitives/status/chevron';
import { ActionLane, CardBody, CardHeading, cardSpace } from './card-parts';
import type { CollapsibleCardProps } from './card-props';

/*
 * A collapsible card holds only its title, the chevron after it and the actions lane; its body and footer fold
 * together. The card fills the width its container gives it, so folding never changes that width, and the title
 * row is the same height open and closed: only the body comes and goes below it. The title and the body share
 * the card's padding as their left edge; the press area adds none of its own.
 */
export function CollapsibleCardContent(
  props: CollapsibleCardProps,
): ReactElement {
  const state = useOpenState(props);
  const space = cardSpace(props);

  return (
    <Collapsible {...state}>
      <View className={space.padding}>
        <CollapsibleHeader {...props} open={state.open} />
        <CollapsibleBody {...props} className={space.bodyTop} />
      </View>
    </Collapsible>
  );
}

const CollapsibleBody = (
  props: CollapsibleCardProps & { className: string },
): ReactElement => (
  <CollapsibleContent className={props.className}>
    <CardBody>{props.children}</CardBody>
    <CardBody>{props.footer}</CardBody>
  </CollapsibleContent>
);

// The whole line toggles, so the title's empty space is a target too; the actions lane sits beside the trigger.
const CollapsibleHeader = (props: HeaderProps): ReactElement => (
  <View className="flex-row items-center gap-2">
    <HeaderTrigger {...props} />
    <ActionLane>{props.actions}</ActionLane>
  </View>
);

type HeaderProps = CollapsibleCardProps & { open: boolean };

const HeaderTrigger = (props: HeaderProps): ReactElement => (
  <CollapsibleTrigger
    accessibilityLabel={triggerLabel(props)}
    className={triggerClass}
  >
    <CardHeading title={props.title} />
    <Chevron direction="right" open={props.open} />
  </CollapsibleTrigger>
);

const triggerClass =
  'min-h-6 min-w-0 flex-1 flex-row items-center gap-1 rounded-md web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2';

// The trigger names what pressing it does, as its state reads from aria-expanded.
function triggerLabel(props: HeaderProps): string {
  return `${props.open ? 'Collapse' : 'Expand'} ${props.title}`;
}
