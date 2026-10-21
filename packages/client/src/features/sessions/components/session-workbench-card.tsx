import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { Surface } from '#primitives/layout/surface';
import { DisclosureChevron } from '#primitives/status/disclosure-chevron';
import type { IconName } from '../../../lib/generic/symbols/icon-names';

interface Props {
  title: string;
  icon: IconName;
  onOpen: () => void;
  collapsible?: boolean;
  summary?: ReactNode;
  interactive?: boolean;
  testID: string;
  children: ReactNode;
}

type HeadingProps = Props & { open: boolean; toggle: () => void };

// Paper / WorkbenchGlass: each section owns its glass plate and casts its own shadow.
export function WorkbenchCard(props: Props): ReactElement {
  const [open, setOpen] = useState(true);

  return (
    <WorkbenchPlate {...props}>
      <CardContents {...props} open={open} toggle={() => setOpen(!open)} />
    </WorkbenchPlate>
  );
}

function WorkbenchPlate(props: Props): ReactElement {
  return (
    <View testID={props.testID}>
      <Surface kind="glass">{props.children}</Surface>
    </View>
  );
}

function CardContents(props: HeadingProps): ReactElement {
  return (
    <View className="gap-2">
      <WorkbenchHeading {...props} />
      {props.open &&
        (props.interactive ? props.children : <BodyAction {...props} />)}
    </View>
  );
}

function BodyAction(props: Props): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Open ${props.title} overview`}
      onPress={props.onOpen}
    >
      {props.children}
    </Pressable>
  );
}

function WorkbenchHeading(props: HeadingProps): ReactElement {
  return (
    <View className="flex-row items-center gap-2 pt-3 pr-4 pl-1">
      <HeadingAction {...props} />
      {props.collapsible && <Disclosure {...props} />}
      <View className="flex-1" />
      {props.summary}
    </View>
  );
}

function HeadingAction(props: Props): ReactElement {
  return (
    <Pressable
      role="button"
      accessibilityLabel={props.title}
      onPress={props.onOpen}
      className="flex-row items-center gap-2"
    >
      <HeadingLabel {...props} />
    </Pressable>
  );
}

function HeadingLabel(props: Props): ReactElement {
  return (
    <>
      <View className="w-7 shrink-0 items-center">
        <Icon name={props.icon} role="body" />
      </View>
      <Text role="heading" accessibilityRole="heading" aria-level={3}>
        {props.title}
      </Text>
    </>
  );
}

function Disclosure(props: HeadingProps): ReactElement {
  return (
    <Pressable
      role="button"
      className="size-4 items-center justify-center"
      hitSlop={8}
      accessibilityLabel={`${props.open ? 'Collapse' : 'Expand'} ${props.title}`}
      aria-expanded={props.open}
      onPress={props.toggle}
    >
      <DisclosureChevron open={props.open} />
    </Pressable>
  );
}
