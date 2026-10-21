import { useState, type ReactElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  Collapsible,
  CollapsibleContent,
} from '#primitives/layout/collapsible';
import { Surface } from '#primitives/layout/surface';
import type { IconName } from '../../../lib/generic/symbols/icon-names';
import { WorkbenchCollapsibleTitle } from './workbench-collapsible-title';

interface Props {
  title: string;
  icon: IconName;
  onOpen: () => void;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  summary?: ReactNode;
  interactive?: boolean;
  testID: string;
  children: ReactNode;
}

type HeadingProps = Props & { open: boolean; toggle: () => void };

// Paper / WorkbenchGlass: each section owns its glass plate and casts its own shadow.
export function WorkbenchCard(props: Props): ReactElement {
  const [open, setOpen] = useState(props.defaultExpanded ?? true);

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
    <Collapsible open={props.open}>
      <CardTitle {...props} />
      <CollapsibleContent>
        <View className="pt-2">
          {props.interactive ? props.children : <BodyAction {...props} />}
        </View>
      </CollapsibleContent>
    </Collapsible>
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

function CardTitle(props: HeadingProps): ReactElement {
  return (
    <WorkbenchCollapsibleTitle
      title={props.title}
      icon={props.icon}
      summary={props.summary}
      expanded={props.collapsible ? props.open : undefined}
      onPress={props.collapsible ? props.toggle : props.onOpen}
    />
  );
}
