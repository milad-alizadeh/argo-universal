import type * as React from 'react';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/buttons/icon-button/icon-button';
import { Text } from '#primitives/display/text/text';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#primitives/overlays/dropdown-menu/dropdown-menu';
import { ListTitle } from '../../../../lib/product/list-title';
import type { Section } from '../../../../lib/product/navigation/sections';
import { PageHeader } from '../../../../lib/product/page-header';
import { InspectorPane } from '../inspector-pane';
import { DesktopShell } from './desktop-shell';
import { frameShellProps } from './desktop-shell-frame-defaults.mocks';
import type { DesktopShellProps } from './desktop-shell-props';

export type DesktopShellFrameProps = Partial<
  Omit<DesktopShellProps, 'inspector'>
> & {
  // The Inspector's content, under its header.
  inspector?: ReactNode;
};

interface FramePanesInput {
  title: string;
  inspector: ReactNode;
  onInspectorStateChange: DesktopShellProps['onInspectorStateChange'];
}

const moreActionsButton: IconButtonProps = {
  variant: 'ghost',
  className: 'size-7 p-0 sm:size-7',
  accessibilityLabel: 'More actions',
  icon: 'more',
  iconClassName: 'text-muted-foreground',
  size: 'md',
};

function sectionTitle(section: Section): string {
  return section.charAt(0).toUpperCase() + section.slice(1);
}

function FrameText({
  testID,
  text,
}: {
  testID: string;
  text: string;
}): React.JSX.Element {
  return (
    <View className="p-4">
      <Text testID={testID}>{text}</Text>
    </View>
  );
}

function FrameInspectorContent(props: FramePanesInput): ReactNode {
  return (
    props.inspector ?? (
      <FrameText testID="inspector-content" text={`${props.title} Inspector`} />
    )
  );
}

function FrameInspector(
  props: FramePanesInput & { expanded: boolean },
): React.JSX.Element {
  return (
    <InspectorPane
      title="Inspector"
      expanded={props.expanded}
      onStateChange={props.onInspectorStateChange}
    >
      <FrameInspectorContent {...props} />
    </InspectorPane>
  );
}

function framePanes(
  input: FramePanesInput,
): Pick<DesktopShellProps, 'inspector' | 'listHeader' | 'list'> {
  return {
    inspector: (expanded) => <FrameInspector {...input} expanded={expanded} />,
    listHeader: <ListTitle>{input.title}</ListTitle>,
    list: <FrameText testID="list-content" text={`${input.title} list`} />,
  };
}

function MoreActionsMenu(): React.JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton {...moreActionsButton} />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Text>Example action</Text>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FrameDetail({ title }: { title: string }): React.JSX.Element {
  return (
    <View className="flex-1">
      <PageHeader title={`${title} page`} actions={<MoreActionsMenu />} />
      <View className="flex-1 p-4">
        <Text testID="detail-content">{title} detail</Text>
      </View>
    </View>
  );
}

export function DesktopShellFrame(
  props: DesktopShellFrameProps,
): React.JSX.Element {
  const shell = frameShellProps(props);
  const title = sectionTitle(shell.selectedSection);
  const panes = framePanes({ ...shell, title, inspector: props.inspector });

  return (
    <View className="flex-1">
      <DesktopShell {...shell} {...panes}>
        {props.children ?? <FrameDetail title={title} />}
      </DesktopShell>
    </View>
  );
}
