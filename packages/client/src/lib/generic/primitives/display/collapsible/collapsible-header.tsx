import * as CollapsiblePrimitive from '@rn-primitives/collapsible';
import { createContext, type ReactElement, useContext, useState } from 'react';
import { View } from 'react-native';
import { DisclosureChevron } from '#primitives/display/disclosure-chevron';
import { Icon } from '#primitives/display/icon';
import { Text, TextClassContext } from '#primitives/display/text';
import { OpenContext } from './collapsible-context';
import type { CollapsibleHeaderProps } from './collapsible-props';

const HoveredContext = createContext(false);

// Whether the pointer is over the header, for children that draw their own emphasis.
export function useCollapsibleHovered(): boolean {
  return useContext(HoveredContext);
}

const headerColour = (hovered: boolean): string =>
  hovered ? 'text-foreground' : 'text-muted-foreground';

function HeaderLabel({ label }: { label: string }): ReactElement {
  return (
    <Text
      numberOfLines={1}
      selectable={false}
      role="body"
      className="min-w-0 shrink"
    >
      {label}
    </Text>
  );
}

function HeaderTitle(
  props: CollapsibleHeaderProps & { hovered: boolean },
): ReactElement {
  const open = useContext(OpenContext);

  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      {props.children ?? <HeaderLabel label={props.label} />}
      <DisclosureChevron
        open={open}
        role="chevron"
        className={headerColour(props.hovered)}
      />
    </View>
  );
}

type HeaderTriggerProps = CollapsibleHeaderProps & {
  hovered: boolean;
  onHoveredChange: (hovered: boolean) => void;
};

function HeaderIcon(props: CollapsibleHeaderProps): ReactElement | null {
  if (!props.icon) return null;

  return (
    <Icon
      name={props.icon}
      role="body"
      tone={props.iconTone}
      className="shrink-0"
    />
  );
}

function HeaderTrigger(props: HeaderTriggerProps): ReactElement {
  return (
    <CollapsiblePrimitive.Trigger
      accessibilityLabel={props.label}
      onHoverIn={() => props.onHoveredChange(true)}
      onHoverOut={() => props.onHoveredChange(false)}
      className="min-h-5 max-w-full self-start flex-row items-center gap-1.5"
    >
      <HeaderIcon {...props} />
      <HeaderTitle {...props} />
    </CollapsiblePrimitive.Trigger>
  );
}

// The disclosure's trigger: icon, label and a chevron after the label, muted until hovered; no fill and no padding.
export function CollapsibleHeader(props: CollapsibleHeaderProps): ReactElement {
  const [hovered, setHovered] = useState(false);

  return (
    <HoveredContext.Provider value={hovered}>
      <TextClassContext.Provider value={`select-none ${headerColour(hovered)}`}>
        <HeaderTrigger
          {...props}
          hovered={hovered}
          onHoveredChange={setHovered}
        />
      </TextClassContext.Provider>
    </HoveredContext.Provider>
  );
}
