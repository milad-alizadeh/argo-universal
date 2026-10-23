import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { PopoverHoverGroup } from '@repo/kit/primitives/overlays/popover';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { agentRow } from './agent-row';
import { effortControl, switchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  loadingConfiguration,
  switches,
} from './configuration-values';
import { modelPicker } from './model-picker';
import { optionPickers } from './option-pickers';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

interface ContentsProps extends MenuProps {
  // The desktop popover's menu, rather than a sheet's page.
  wide: boolean;
}

/*
 * Configure's settings as a FieldGroup, with no section titles (ADR-0042): the Agent, Model and the Agent's
 * other choices open their pages beside it on a desktop and push them on the Sheet's own stack elsewhere; Effort
 * is a slider and the Agent's on/off options are toggles.
 */
export function AgentModelMenu(props: ContentsProps): ReactElement {
  const layout = useMenuLayout(props);

  return (
    <View className="native:flex-1 bg-content web:wide:bg-card" {...layout}>
      <PopoverHoverGroup>
        <FieldGroup>{menuSections(props)}</FieldGroup>
        <ConfigurationStatus configuration={props.configuration} />
      </PopoverHoverGroup>
    </View>
  );
}

/*
 * The settled sections, or the Agent and a Model row while the Agent's settings are on their way. A FieldGroup
 * reads its sections from what it is given, so these are calls rather than components.
 */
function menuSections(props: ContentsProps): ReactNode[] {
  if (loadingConfiguration(props.configuration)) return [loadingSection(props)];

  return [choicesSection(props), tuningSection(props)];
}

function ConfigurationStatus({ configuration }: MenuProps): ReactNode {
  return configuration.status ?? null;
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

// The Agent keeps its place and its press while its settings load: it is how the reader got here.
function loadingSection(props: ContentsProps): ReactElement {
  return (
    <FieldGroup.Section key="choices">
      {agentRow(props.configuration)}
      <FieldGroup.Value title="Model" value="Loading" />
    </FieldGroup.Section>
  );
}

function choicesSection(props: ContentsProps): ReactElement {
  const { configuration } = props;

  const notice = hasTuning(configuration)
    ? undefined
    : configurationNotice(configuration);

  return (
    <FieldGroup.Section key="choices" footer={notice}>
      {agentRow(configuration)}
      {modelPicker({ configuration })}
      {optionPickers({ configuration })}
    </FieldGroup.Section>
  );
}

// Paper puts Effort before the switches on a desktop; a phone's sheet keeps its switches first.
function tuningSection(props: ContentsProps): ReactElement | null {
  const { configuration, wide } = props;

  if (!hasTuning(configuration)) return null;

  const switchRows = switchOptions({ configuration });
  const effort = effortControl({ configuration });

  return (
    <FieldGroup.Section
      key="tuning"
      footer={configurationNotice(configuration)}
    >
      {wide ? [effort, ...switchRows] : [...switchRows, effort]}
    </FieldGroup.Section>
  );
}

/*
 * The card keeps the height it had before the switch, so its rows fill in where they stand instead of the popover
 * shrinking to a line and growing back (owner, 2026-10-20).
 */
function useMenuLayout(
  props: ContentsProps,
): Pick<ViewProps, 'style' | 'onLayout'> {
  const [readyHeight, setReadyHeight] = useState<number>();
  const loading = loadingConfiguration(props.configuration);
  const retainHeight = props.wide && loading;

  return {
    style: retainHeight ? { minHeight: readyHeight } : undefined,
    onLayout: (event) => {
      if (!props.wide || loading) return;
      setReadyHeight(event.nativeEvent.layout.height);
    },
  };
}
