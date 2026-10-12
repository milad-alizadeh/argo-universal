import type * as React from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text/text';
import { ListItem } from '#primitives/lists/list-item/list-item';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
  usePopoverClose,
} from '#primitives/overlays/popover/popover';
import { FieldRowEnd } from '../../../../lib/generic/primitives/fields/field-layout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { configurationChoices } from '../../state/configuration-choices';
import { AgentChoices } from './agent-choices';
import { AgentIcon } from './agent-icon';
import type { ComposerConfigurationProps } from './configuration-types';
import { modelName, selection } from './configuration-values';
import { ModelChoices } from './model-choices';

export function ConfigurationDrill({
  configuration,
  page,
  onOpenPage,
}: {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
  onOpenPage: (page: 'agent' | 'model') => void;
}): React.JSX.Element | null {
  const wide = useWide() && Platform.OS === 'web';
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  const model = selection(configuration, 'model');
  const current = configurationChoices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  if (page === 'model' && !model) return null;
  const row = (
    <ListItem
      title={page === 'agent' ? 'Agent' : 'Model'}
      value={page === 'agent' ? agent?.label : modelName(current)}
      valueLeading={
        page === 'agent' ? (
          <AgentIcon agent={agent} role={wide ? 'control' : 'row'} />
        ) : undefined
      }
      role="button"
      onPress={() => onOpenPage(page)}
    />
  );
  if (!wide) return row;
  return (
    <FieldRowEnd value={page === 'model'}>
      <Popover openOnHover>
        <PopoverTrigger asChild>{row}</PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          sideOffset={24}
          alignOffset={-4}
          accessibilityLabel={
            page === 'agent' ? 'Select Agent' : 'Select Model'
          }
          style={{ width: 284 }}
          className="bg-sidebar border-0 dark:border dark:border-border rounded-surface p-3 shadow-card"
        >
          <ConfigurationPicker configuration={configuration} page={page} />
        </PopoverContent>
      </Popover>
    </FieldRowEnd>
  );
}

function ConfigurationPicker({
  configuration,
  page,
}: {
  configuration: ComposerConfigurationProps;
  page: 'agent' | 'model';
}): React.JSX.Element {
  const close = usePopoverClose();
  return (
    <View className="gap-3">
      <Text role="heading" aria-level={2} className="px-4 pt-1">
        {page === 'agent' ? 'Select Agent' : 'Select Model'}
      </Text>
      {page === 'agent' ? (
        <AgentChoices configuration={configuration} onSelect={close} />
      ) : (
        <ModelChoices configuration={configuration} onSelect={close} />
      )}
    </View>
  );
}
