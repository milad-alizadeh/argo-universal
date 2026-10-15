import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListItemEnd } from '#primitives/lists/grouped-list-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selectedChoice, selection } from './configuration-values';
import { ModelChoices } from './model-choices';

interface DrillProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
  onOpenPage: (page: 'agent' | 'model') => void;
}

interface PickerProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
}

export function ConfigurationDrill(
  props: DrillProps,
): React.JSX.Element | null {
  const wide = isDesktopDrill(useWide());

  if (!hasDrillOption(props)) return null;
  const row = configurationDrillRow({ ...props, wide });

  return wide ? <ConfigurationDrillPopover {...props} row={row} /> : row;
}

function configurationDrillRow(
  props: DrillProps & { wide: boolean },
): React.JSX.Element {
  return (
    <GroupedListItem
      {...drillRowContent(props)}
      accessibilityRole="button"
      onPress={() => props.onOpenPage(props.page)}
    />
  );
}

function drillRowContent(
  props: DrillProps & { wide: boolean },
): React.ComponentProps<typeof GroupedListItem> {
  if (props.page === 'agent') return agentDrillContent(props);

  return {
    label: 'Model',
    value: modelName(selectedChoice(props.configuration, 'model')),
  };
}

function agentDrillContent(
  props: DrillProps & { wide: boolean },
): React.ComponentProps<typeof GroupedListItem> {
  const agent = props.configuration.agents.find(
    (entry) => entry.agent === props.configuration.agent,
  );

  return {
    label: 'Agent',
    value: agent?.label,
    valueLeading: (
      <AgentIcon agent={agent} role={props.wide ? 'control' : 'row'} />
    ),
  };
}

function ConfigurationDrillPopover({
  page,
  row,
  configuration,
}: PickerProps & { row: React.ReactElement }): React.JSX.Element {
  return (
    <GroupedListItemEnd value={page === 'model'}>
      <Popover openOnHover>
        <PopoverTrigger asChild>{row}</PopoverTrigger>
        <ConfigurationDrillContent configuration={configuration} page={page} />
      </Popover>
    </GroupedListItemEnd>
  );
}

const drillPopoverPlacement = {
  side: 'right',
  align: 'start',
  sideOffset: 24,
  alignOffset: -4,
  style: { width: 284 },
  className:
    'bg-content border-0 dark:border dark:border-border rounded-2xl p-3 shadow-card',
} as const;

function ConfigurationDrillContent(props: PickerProps): React.JSX.Element {
  return (
    <PopoverContent
      {...drillPopoverPlacement}
      accessibilityLabel={pickerTitle(props.page)}
    >
      <ConfigurationPicker {...props} />
    </PopoverContent>
  );
}

function pickerTitle(page: PickerProps['page']): string {
  return page === 'agent' ? 'Select Agent' : 'Select Model';
}

function ConfigurationPicker(props: PickerProps): React.JSX.Element {
  const close = usePopoverClose();

  return (
    <View className="gap-3">
      <Text role="heading" aria-level={2} className="px-4 pt-1">
        {pickerTitle(props.page)}
      </Text>
      <ConfigurationPickerChoices {...props} close={close} />
    </View>
  );
}

function ConfigurationPickerChoices({
  configuration,
  page,
  close,
}: PickerProps & { close: () => void }): React.JSX.Element {
  return page === 'agent' ? (
    <AgentChoices configuration={configuration} onSelect={close} />
  ) : (
    <ModelChoices configuration={configuration} onSelect={close} />
  );
}

function hasDrillOption({ configuration, page }: DrillProps): boolean {
  return page === 'agent' || !!selection(configuration, 'model');
}

function isDesktopDrill(wide: boolean): boolean {
  return wide && Platform.OS === 'web';
}
