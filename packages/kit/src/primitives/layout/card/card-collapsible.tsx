import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#primitives/layout/collapsible';
import { useOpenState } from '#primitives/overlays/open-state';
import { Chevron } from '#primitives/status/chevron';
import { ActionLane, CardHeading, cardSpace } from './card-parts';
import type { CardProps } from './card-props';

/*
 * A collapsible card holds only its title, the chevron after it and the actions lane; its body and footer fold
 * together. The card fills the width its container gives it, so folding never changes that width, and the title
 * row is the same height open and closed: only the body comes and goes below it. The title and the body share
 * the card's padding as their left edge; the press area adds none of its own.
 */
export function CollapsibleCardContent(props: CardProps): ReactElement {
  const state = useOpenState(props);
  const space = cardSpace(props);

  return (
    <Collapsible {...state}>
      <View className={space.padding}>
        <CollapsibleHeader {...props} open={state.open} />
        <CollapsibleContent className={space.bodyTop}>
          {props.children}
          {props.footer}
        </CollapsibleContent>
      </View>
    </Collapsible>
  );
}

// The whole line toggles, so the title's empty space is a target too; the actions lane sits beside the trigger.
function CollapsibleHeader(props: CardProps & { open: boolean }): ReactElement {
  return (
    <View className="flex-row items-center gap-2">
      <CollapsibleTrigger
        accessibilityLabel={triggerLabel(props)}
        className="min-h-6 min-w-0 flex-1 flex-row items-center gap-1 rounded-md web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:outline-offset-2"
      >
        <CardHeading title={props.title} />
        <Chevron direction="right" open={props.open} />
      </CollapsibleTrigger>
      <ActionLane>{props.actions}</ActionLane>
    </View>
  );
}

// The trigger names what pressing it does, as its state reads from aria-expanded.
function triggerLabel(props: CardProps & { open: boolean }): string {
  return `${props.open ? 'Collapse' : 'Expand'} ${props.title}`;
}
