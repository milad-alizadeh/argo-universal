import { List, ListSection } from '@repo/kit/primitives/lists/list';
import { PopoverHoverGroup } from '@repo/kit/primitives/overlays/popover';
import { useState, type ReactElement, type ReactNode } from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import { AgentDrill } from './agent-drill';
import { AgentNameRow } from './agent-name-row';
import {
  loadingSections,
  useConfigurationRows,
  type ConfigurationRows,
} from './configuration-skeleton';
import { EffortControl, switchOptions } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import {
  currentEffort,
  loadingConfiguration,
  switches,
} from './configuration-values';
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
  const layout = useMenuLayout(props);
  const loading = loadingConfiguration(props.configuration);
  const rows = useConfigurationRows(props.configuration, loading);

  return (
    <View className="native:flex-1 bg-content web:wide:bg-card" {...layout}>
      <PopoverHoverGroup>
        <List appearance="plain" fit={Platform.OS === 'web' || props.wide}>
          {menuSections({ ...props, loading, rows })}
        </List>
        <ConfigurationStatus configuration={props.configuration} />
      </PopoverHoverGroup>
    </View>
  );
}

type SectionsProps = ContentsProps & {
  loading: boolean;
  rows: ConfigurationRows;
};

/*
 * The settled sections, or the rows they will come back in. A list reads its sections from what it is
 * given, so these are calls rather than components.
 */
function menuSections(props: SectionsProps): ReactNode[] {
  if (props.loading)
    return loadingSections({ rows: props.rows, agent: agentRow(props) });

  return [configurationDrills(props), configurationTuning(props)];
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

// Calls, as List reads its sections and their rows from its direct children.
function configurationDrills(props: ContentsProps): ReactElement {
  const notice = hasTuning(props.configuration)
    ? undefined
    : configurationNotice(props.configuration);

  return (
    <ListSection key="drills" footer={notice}>
      {agentRow(props)}
      {settingRows(props)}
    </ListSection>
  );
}

/*
 * The Agent, where it can still be chosen or where nothing else names it. Once a Session is running the Agent is
 * fixed and the page is titled with its name; a row that repeats the title and does nothing collides with the
 * Agents' own options, which are free to call themselves anything, "Agent" included (owner, 2026-10-20). An Agent
 * that is not installed has no name to title the page with, so its row stays and says its id.
 */
function agentRow(props: ContentsProps): ReactElement[] {
  if (!props.configuration.agentChoices)
    return [<AgentNameRow key="agent" configuration={props.configuration} />];

  return [<AgentDrill key="agent" configuration={props.configuration} />];
}

// The rows below the Agent, once the Agent has sent them.
function settingRows(props: ContentsProps): ReactElement[] {
  return [
    <ModelPicker key="model" configuration={props.configuration} />,
    ...optionDrills(props),
  ];
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

// Paper puts Effort before the switches on a desktop; a phone's sheet keeps its switches first.
function configurationTuning(props: ContentsProps): ReactElement | null {
  const { configuration } = props;

  if (!hasTuning(configuration)) return null;

  return (
    <ListSection key="tuning" footer={configurationNotice(configuration)}>
      {tuningRows(props)}
    </ListSection>
  );
}

function tuningRows({ configuration, wide }: ContentsProps): ReactElement[] {
  const switchRows = switchOptions({ configuration });
  const effort = <EffortControl key="effort" configuration={configuration} />;

  return wide ? [effort, ...switchRows] : [...switchRows, effort];
}
