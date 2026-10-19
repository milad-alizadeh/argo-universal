import { useState, type ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { List, ListSection } from '#primitives/lists/list';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
import { Spinner } from '#primitives/status/spinner';
import { AgentDrill } from './agent-drill';
import { EffortControl, switchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';
import { ModelPicker } from './model-picker';
import { optionDrills } from './option-drill';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

interface ContentsProps extends MenuProps {
  // The desktop popover's menu, rather than a sheet's page.
  wide: boolean;
}

/*
 * Configure's settings, with no section titles: on a desktop a flat menu, as Paper's Configure, whose drill rows
 * open beside it; elsewhere a sheet page, titled with the Agent's name, whose rows push pages.
 */
export function AgentModelMenu(props: ContentsProps): ReactElement {
  const [readyHeight, setReadyHeight] = useState<number>();
  const loading =
    props.configuration.opening && !props.configuration.configOptions.length;

  return (
    <View
      className="native:flex-1 bg-content web:wide:bg-card"
      style={props.wide && loading ? { minHeight: readyHeight } : undefined}
      onLayout={(event) => {
        if (props.wide && !loading)
          setReadyHeight(event.nativeEvent.layout.height);
      }}
    >
      <PopoverHoverGroup>
        <List appearance="grouped" fit={Platform.OS === 'web' || props.wide}>
          {configurationDrills(props)}
          {configurationTuning(props)}
        </List>
        {props.configuration.status ??
          (props.configuration.opening &&
          !props.configuration.configOptions.length ? (
            <View className="flex-row items-center gap-2 p-3">
              <Spinner accessibilityLabel="Loading configuration…" />
              <Text role="body" tone="muted">
                Loading configuration…
              </Text>
            </View>
          ) : null)}
      </PopoverHoverGroup>
    </View>
  );
}

function hasTuning(configuration: ComposerConfigurationProps): boolean {
  return (
    switches(configuration).length > 0 ||
    !!currentEffort(configuration).selected
  );
}

function configurationNotice(
  configuration: ComposerConfigurationProps,
): string | undefined {
  return configuration.turnRunning
    ? 'A Turn is running. Changes apply from the next Turn.'
    : undefined;
}

// Calls, as List reads its sections and their rows from its direct children.
function configurationDrills(props: ContentsProps): ReactElement {
  const notice = hasTuning(props.configuration)
    ? undefined
    : configurationNotice(props.configuration);

  return (
    <ListSection footer={notice}>
      <AgentDrill configuration={props.configuration} />
      <ModelPicker configuration={props.configuration} />
      {optionDrills(props)}
    </ListSection>
  );
}

// Paper puts Effort before the switches on a desktop; a phone's sheet keeps its switches first.
function configurationTuning(props: ContentsProps): ReactElement | null {
  const { configuration } = props;

  if (!hasTuning(configuration)) return null;

  return (
    <ListSection footer={configurationNotice(configuration)}>
      {tuningRows(props)}
    </ListSection>
  );
}

function tuningRows({ configuration, wide }: ContentsProps): ReactElement[] {
  const switchRows = switchOptions({ configuration });
  const effort = <EffortControl key="effort" configuration={configuration} />;

  return wide ? [effort, ...switchRows] : [...switchRows, effort];
}
