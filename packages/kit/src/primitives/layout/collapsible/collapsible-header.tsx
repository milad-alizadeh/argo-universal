import {
  createContext,
  type ComponentType,
  type ReactElement,
  type ReactNode,
  useContext,
  useState,
} from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text, TextClassContext } from '#primitives/content/text';
import { Chevron } from '#primitives/status/chevron';
import { OpenContext } from './collapsible-context';
import type { CollapsibleHeaderProps } from './collapsible-props';

const HoveredContext = createContext(false);

// Whether the pointer is over the header, for children that draw their own emphasis.
export function useCollapsibleHovered(): boolean {
  return useContext(HoveredContext);
}

const headerColour = (hovered: boolean): string =>
  hovered ? 'text-foreground' : 'text-muted-foreground';

// A box one Body line tall, so a glyph centres on the label's line instead of sitting on its baseline.
function LineSlot({ children }: { children: ReactNode }): ReactElement {
  return (
    <View className="h-6 shrink-0 items-center justify-center wide-type:h-5">
      {children}
    </View>
  );
}

// No role: an explicit role's colour would override the header's muted colour; the default is Body.
function HeaderLabel({ label }: { label: string }): ReactElement {
  return (
    <Text numberOfLines={1} selectable={false} className="min-w-0 shrink">
      {label}
    </Text>
  );
}

function HeaderChevron({ hovered }: { hovered: boolean }): ReactElement {
  return (
    <LineSlot>
      <Chevron
        direction="right"
        open={useContext(OpenContext)}
        className={headerColour(hovered)}
      />
    </LineSlot>
  );
}

function HeaderTitle(
  props: CollapsibleHeaderProps & { hovered: boolean },
): ReactElement {
  return (
    <View className="min-w-0 shrink flex-row items-center gap-1">
      {props.children ?? <HeaderLabel label={props.label} />}
      <HeaderChevron hovered={props.hovered} />
    </View>
  );
}

type HeaderProps = CollapsibleHeaderProps & {
  trigger: ComponentType<{
    accessibilityLabel: string;
    onHoverIn: () => void;
    onHoverOut: () => void;
    className: string;
    children: ReactNode;
  }>;
};

type HeaderTriggerProps = HeaderProps & {
  hovered: boolean;
  onHoveredChange: (hovered: boolean) => void;
};

function HeaderIcon(props: CollapsibleHeaderProps): ReactElement | null {
  if (props.leading) return <LineSlot>{props.leading}</LineSlot>;

  if (!props.icon) return null;

  return (
    <LineSlot>
      <Icon name={props.icon} tone={props.iconTone} />
    </LineSlot>
  );
}

function HeaderTrigger(props: HeaderTriggerProps): ReactElement {
  const Trigger = props.trigger;

  return (
    <Trigger
      accessibilityLabel={props.label}
      onHoverIn={() => props.onHoveredChange(true)}
      onHoverOut={() => props.onHoveredChange(false)}
      className="max-w-full self-start flex-row items-center gap-1.5"
    >
      <HeaderIcon {...props} />
      <HeaderTitle {...props} />
    </Trigger>
  );
}

function Header(props: HeaderProps): ReactElement {
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

// Keep header composition shared while each drawing supplies its own accessible trigger.
export function createCollapsibleHeader(
  trigger: HeaderProps['trigger'],
): (props: CollapsibleHeaderProps) => ReactElement {
  return function CollapsibleHeader(
    props: CollapsibleHeaderProps,
  ): ReactElement {
    return <Header {...props} trigger={trigger} />;
  };
}
