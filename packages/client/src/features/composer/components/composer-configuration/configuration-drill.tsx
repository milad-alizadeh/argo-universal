import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/display/text';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListItemEnd } from '#primitives/lists/grouped-list-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover';
import { Sheet } from '#primitives/overlays/sheet';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selectedChoice, selection } from './configuration-values';
import { ModelChoices } from './model-choices';

interface DrillProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
  // A desktop window opens the choices in a popover beside the row; elsewhere the row pushes the sheet's page.
  wide: boolean;
}

interface PickerProps {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
}

export function ConfigurationDrill(
  props: DrillProps,
): React.JSX.Element | null {
  if (!hasDrillOption(props)) return null;
  const content = drillRowContent(props);

  if (!props.wide) return <Sheet.Link to={props.page} {...content} />;

  return (
    <ConfigurationDrillPopover
      {...props}
      row={<GroupedListItem {...content} accessibilityRole="button" />}
    />
  );
}

interface DrillContent {
  label: string;
  value?: string;
  valueLeading?: React.ReactElement;
}

function drillRowContent(props: DrillProps): DrillContent {
  if (props.page === 'agent') return agentDrillContent(props);

  return {
    label: 'Model',
    value: modelName(selectedChoice(props.configuration, 'model')),
  };
}

function agentDrillContent(props: DrillProps): DrillContent {
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
    'bg-content border-0 dark:border dark:border-border rounded-surface p-3 shadow-card',
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
