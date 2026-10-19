import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { List, ListSection } from '#primitives/lists/list';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
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
 * Configure's settings: on a desktop a flat menu, as Paper's Configure, with no titles, whose drill rows open
 * beside it; elsewhere a sheet page of titled sections whose rows push pages.
 */
export function AgentModelMenu(props: ContentsProps): ReactElement {
  return (
    <View className="native:flex-1 bg-content web:wide:bg-card">
      <PopoverHoverGroup>
        <List appearance="grouped" fit={Platform.OS === 'web' || props.wide}>
          {configurationDrills(props)}
          {configurationTuning(props)}
        </List>
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

// A sheet's section title; the desktop menu has none.
function sectionTitle(props: ContentsProps, title: string): string | undefined {
  return props.wide ? undefined : title;
}

// Calls, as List reads its sections and their rows from its direct children.
function configurationDrills(props: ContentsProps): ReactElement {
  const notice = hasTuning(props.configuration)
    ? undefined
    : configurationNotice(props.configuration);

  return (
    <ListSection title={sectionTitle(props, 'Model')} footer={notice}>
      <AgentDrill configuration={props.configuration} wide={props.wide} />
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
    <ListSection
      title={sectionTitle(props, 'Response')}
      footer={configurationNotice(configuration)}
    >
      {tuningRows(props)}
    </ListSection>
  );
}

function tuningRows({ configuration, wide }: ContentsProps): ReactElement[] {
  const switchRows = switchOptions({ configuration });
  const effort = <EffortControl key="effort" configuration={configuration} />;

  return wide ? [effort, ...switchRows] : [...switchRows, effort];
}
