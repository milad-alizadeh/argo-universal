import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Platform, View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import { Button } from '#primitives/buttons/button/button';
import { Text } from '#primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';
import { configurationChoices } from '../../state/configuration-choices';
import {
  publishAgentModelConfiguration,
  useNativeSheets,
} from '../agent-model-sheet-context';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { AgentIcon } from './agent-icon';
import { AgentModelMenu } from './agent-model-menu';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  selection,
  switches,
  modelName,
} from './configuration-values';
const agentModelMenuWidth = 320;
const fastModeConfigId = 'fast';

export function ComposerAgentModelControl({
  configuration,
  disabled,
}: {
  configuration: ComposerConfigurationProps;
  disabled: boolean;
}): React.JSX.Element | null {
  const wide = useContentWide();
  const model = selection(configuration, 'model');
  const current = configurationChoices(model).find(
    (choice) => choice.value === model?.currentValue,
  );
  const effort = currentEffort(configuration);
  const effortLabel = effort.selected?.name;
  const fastOn = switches(configuration).some(
    (option) => option.configId === fastModeConfigId && option.currentValue,
  );
  // Commit the fallback level so what is shown is what the Agent runs with.
  const fallbackValue = effort.fallback ? effort.selected?.value : undefined;
  const effortConfigId = effort.option?.configId;
  // The latest callback is read through a ref so a new callback identity does not commit again.
  const onConfigChange = useRef(configuration.onConfigChange);
  useEffect(() => {
    onConfigChange.current = configuration.onConfigChange;
  });
  useEffect(() => {
    if (effortConfigId && fallbackValue)
      onConfigChange.current(effortConfigId, fallbackValue);
  }, [effortConfigId, fallbackValue]);
  const agent = configuration.agents.find(
    (entry) => entry.agent === configuration.agent,
  );
  const presentSheet = useNativeSheets()?.agentModel;
  const nativeSheet = presentSheet && Platform.OS !== 'web';
  useEffect(() => {
    if (nativeSheet) publishAgentModelConfiguration(configuration);
  }, [nativeSheet, configuration]);
  if (!model && !agent) return null;
  return (
    <ComposerPopover
      listContent
      label="Agent and model"
      width={agentModelMenuWidth}
      className="shrink min-w-0"
      onPresent={nativeSheet ? presentSheet : undefined}
      trigger={
        <Button
          appearance="content"
          variant="ghost"
          disabled={disabled}
          accessibilityLabel="Agent and model"
          label={modelName(current) || agent?.label || ''}
          labelNumberOfLines={1}
          className="h-7 sm:h-7 py-0 px-1.5 gap-1.5 shrink min-w-0"
          labelClassName="min-w-0 shrink"
          leading={wide ? <AgentIcon agent={agent} /> : undefined}
          trailing={
            <View className="flex-row items-center gap-1.5">
              {wide &&
                current?._meta?.argo?.supportsEffort !== false &&
                effortLabel && (
                  <Text role="control" className="text-muted-foreground">
                    {effortLabel}
                  </Text>
                )}
              {fastOn && (
                <Icon
                  role="control"
                  name="fast-mode"
                  filled
                  testID="fast-mode-on"
                />
              )}
              {wide && (
                <Icon
                  name="chevron-down"
                  role="control"
                  className="text-muted-foreground"
                />
              )}
            </View>
          }
        />
      }
    >
      {() => <AgentModelMenu configuration={configuration} />}
    </ComposerPopover>
  );
}
