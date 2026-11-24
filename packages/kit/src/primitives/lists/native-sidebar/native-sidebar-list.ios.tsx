import {
  Button,
  ContextMenu,
  HStack,
  Host,
  Label,
  List,
  ProgressView,
  Section,
  Spacer,
  Text,
  VStack,
} from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  accessibilityHidden,
  disabled,
  font,
  foregroundStyle,
  lineLimit,
  listStyle,
  onAppear,
  padding,
  refreshable,
  scrollContentBackground,
  tag,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement, ReactNode } from 'react';
import { useNativeTheme } from '../../../native-theme';
import { NativeSymbol } from '../../../symbols/native-symbol';
import type {
  NativeSidebarListProps,
  SidebarAction,
  SidebarRow,
  SidebarSection,
} from './model';

function ActionIcon({ icon }: { icon?: SidebarAction['icon'] }): ReactNode {
  return icon && (typeof icon === 'string' || 'sf' in icon) ? (
    <NativeSymbol name={icon} size="md" />
  ) : null;
}

function contextActions(actions: readonly SidebarAction[]): ReactNode {
  return actions.map((action) => (
    <Button
      key={action.title}
      role={action.destructive ? 'destructive' : 'default'}
      modifiers={action.disabled ? [disabled(true)] : undefined}
      onPress={action.onPress}
    >
      <Label title={action.title} icon={<ActionIcon icon={action.icon} />} />
    </Button>
  ));
}

function WithActions({
  actions,
  children,
}: {
  actions?: readonly SidebarAction[];
  children: ReactElement;
}): ReactElement {
  if (!actions?.length) return children;

  return (
    <ContextMenu>
      <ContextMenu.Items>{contextActions(actions)}</ContextMenu.Items>
      <ContextMenu.Trigger>{children}</ContextMenu.Trigger>
    </ContextMenu>
  );
}

const secondaryText = [
  font({ textStyle: 'footnote' }),
  foregroundStyle('secondary'),
  lineLimit(1),
] as const;

function RowStatus({
  status,
}: {
  status: NonNullable<SidebarRow['status']>;
}): ReactElement {
  const { colors } = useNativeTheme();

  return (
    <HStack modifiers={[accessibilityLabel(status.label)]}>
      <NativeSymbol
        name={{ sf: 'circle.fill', material: 'circle' }}
        size="sm"
        color={colors[status.tone]}
      />
    </HStack>
  );
}

function RowText({ row }: { row: SidebarRow }): ReactElement {
  return (
    <VStack alignment="leading" spacing={2}>
      <Text
        modifiers={[
          lineLimit(1),
          font({ weight: row.emphasized ? 'semibold' : 'regular' }),
        ]}
      >
        {row.title}
      </Text>
      {row.subtitle && (
        <Text modifiers={[...secondaryText]}>{row.subtitle}</Text>
      )}
    </VStack>
  );
}

function RowProgress({
  progress,
}: {
  progress: NonNullable<SidebarRow['progress']>;
}): ReactElement {
  return (
    <ProgressView
      value={progress.value}
      modifiers={
        progress.label
          ? [accessibilityLabel(progress.label)]
          : [accessibilityHidden(true)]
      }
    />
  );
}

const childIndent = 16;

function RowLabel({ row }: { row: SidebarRow }): ReactElement {
  const icon = row.icon;

  return (
    <VStack
      alignment="leading"
      spacing={3}
      modifiers={[padding({ leading: (row.depth ?? 0) * childIndent })]}
    >
      <HStack spacing={8}>
        {icon && (typeof icon === 'string' || 'sf' in icon) && (
          <NativeSymbol name={icon} size="md" lane="row" />
        )}
        <RowText row={row} />
        <Spacer minLength={0} />
        {row.value && <Text modifiers={[...secondaryText]}>{row.value}</Text>}
        {row.status && <RowStatus status={row.status} />}
      </HStack>
      {row.progress && <RowProgress progress={row.progress} />}
    </VStack>
  );
}

const rowKey = (row: SidebarRow): string => row.id;

function SidebarGroup({
  group,
  lastRow,
  onEndReached,
}: {
  group: SidebarSection;
  lastRow?: string;
  onEndReached?: () => void;
}): ReactElement {
  return (
    <Section
      header={
        group.title && (
          <WithActions actions={group.actions}>
            <Text>{group.title}</Text>
          </WithActions>
        )
      }
      isExpanded={group.expanded}
      onIsExpandedChange={group.onExpandedChange}
    >
      <List.ForEach
        data={group.rows}
        keyExtractor={rowKey}
        estimatedItemSize={44}
      >
        {({ item }) => (
          <VStack
            modifiers={[
              tag(item.id),
              ...(item.id === lastRow && onEndReached
                ? [onAppear(onEndReached)]
                : []),
            ]}
          >
            <WithActions actions={item.actions}>
              <RowLabel row={item} />
            </WithActions>
          </VStack>
        )}
      </List.ForEach>
    </Section>
  );
}

export function NativeSidebarList({
  sections,
  empty,
  onRefresh,
  onEndReached,
}: NativeSidebarListProps): ReactNode {
  const { colors, colorScheme } = useNativeTheme();
  const rows = sections.flatMap((section) => section.rows);
  const selected = rows.find((row) => row.selected)?.id;
  const lastRow = rows.at(-1)?.id;

  if (!sections.length) return empty;

  return (
    <Host style={{ flex: 1 }} colorScheme={colorScheme}>
      <List
        selection={selected ? [selected] : []}
        onSelectionChange={(selection) =>
          rows
            .find((row) => row.id !== selected && selection.includes(row.id))
            ?.onPress?.()
        }
        modifiers={[
          listStyle('sidebar'),
          scrollContentBackground('hidden'),
          ...(colors.accent ? [tint(colors.accent)] : []),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}
      >
        {sections.map((group) => (
          <SidebarGroup
            key={group.id}
            group={group}
            lastRow={lastRow}
            onEndReached={onEndReached}
          />
        ))}
      </List>
    </Host>
  );
}
