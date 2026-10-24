import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { PopoverHoverGroup } from '@repo/kit/primitives/overlays/popover';
import { useState, type ReactElement, type ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';
import { agentRow } from './agent-row';
import {
  loadingSections,
  useConfigurationRows,
} from './configuration-skeleton';
import { effortControl, switchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  loadingConfiguration,
  switches,
} from './configuration-values';
import { modelPicker } from './model-picker';
import { optionPickers } from './option-pickers';
import { useAgentPick, type AgentPick } from './use-agent-pick';

interface MenuProps {
  configuration: ComposerConfigurationProps;
}

interface ContentsProps extends MenuProps {
  // The desktop popover's menu, rather than a sheet's page.
  wide: boolean;
}

interface SectionProps extends ContentsProps {
  picking: AgentPick;
  rows: ReturnType<typeof useConfigurationRows>;
}

const nothing = (): void => {};

/*
 * Configure's settings as a FieldGroup, with no section titles (ADR-0042): the Agent, Model and the Agent's
 * other choices open their pages beside it on a desktop and push them on the Sheet's own stack elsewhere; Effort
 * is a slider and the Agent's on/off options are toggles.
 */
export function AgentModelMenu(props: ContentsProps): ReactElement {
  const layout = useMenuLayout(props);
  const sections = useMenuSections(props);

  return (
    <View className="native:flex-1 bg-content web:wide:bg-card" {...layout}>
      <PopoverHoverGroup>
        <FieldGroup>{sections}</FieldGroup>
        <ConfigurationStatus configuration={props.configuration} />
      </PopoverHoverGroup>
    </View>
  );
}

function useMenuSections(props: ContentsProps): ReactNode[] {
  const { configuration } = props;
  const change = configuration.agentChoices?.onChange ?? nothing;
  const picking = useAgentPick(configuration, change);

  const rows = useConfigurationRows(
    configuration,
    loadingConfiguration(configuration),
  );

  return menuSections({ ...props, picking, rows });
}

/*
 * The settled sections, or the Agent and placeholder rows while the Agent's settings are on their way. A FieldGroup
 * reads its sections from what it is given, so these are calls rather than components.
 */
function menuSections(props: SectionProps): ReactNode[] {
  if (loadingConfiguration(props.configuration))
    return loadingSections({
      rows: props.rows,
      agent: agentRow(props.configuration, props.picking),
    });

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

function choicesSection(props: SectionProps): ReactElement {
  const { configuration } = props;

  const notice = hasTuning(configuration)
    ? undefined
    : configurationNotice(configuration);

  return (
    <FieldGroup.Section key="choices" footer={notice}>
      {agentRow(configuration, props.picking)}
      {modelPicker({ configuration })}
      {optionPickers({ configuration })}
    </FieldGroup.Section>
  );
}

// Effort first and the Agent's switches after it, Fast mode last, on every platform (owner, 2026-10-24).
function tuningSection(props: ContentsProps): ReactElement | null {
  const { configuration } = props;

  if (!hasTuning(configuration)) return null;

  const switchRows = switchOptions({ configuration });
  const effort = effortControl({ configuration });

  return (
    <FieldGroup.Section
      key="tuning"
      footer={configurationNotice(configuration)}
    >
      {effort}
      {switchRows}
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
