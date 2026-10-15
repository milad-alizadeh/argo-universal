import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ConfigurationDrill, hasDrillOption } from './configuration-drill';
import { ConfigurationPage } from './configuration-page';
import { effortRow, switchRows } from './configuration-tuning';
import type { ComposerConfigurationProps } from './configuration-types';
import { currentEffort, switches } from './configuration-values';

interface MenuProps {
  configuration: ComposerConfigurationProps;
  onOpenPage?: (page: 'agent' | 'model') => void;
}

interface ContentsProps extends MenuProps {
  wide: boolean;
  openPage: (page: 'agent' | 'model') => void;
}

export function AgentModelMenu(props: MenuProps): React.JSX.Element {
  const wide = isDesktopMenu(useWide());
  const [page, setPage] = useState<'settings' | 'agent' | 'model'>('settings');
  const close = (): void => setPage('settings');
  const openPage = props.onOpenPage ?? setPage;

  return (
    <ConfigurationMenuPage
      {...props}
      wide={wide}
      page={page}
      close={close}
      openPage={openPage}
    />
  );
}

function ConfigurationMenuPage(
  props: ContentsProps & {
    page: 'settings' | 'agent' | 'model';
    close: () => void;
  },
): React.JSX.Element {
  if (props.page !== 'settings' && !props.wide)
    return <ConfigurationPage {...props} page={props.page} />;

  return <ConfigurationContents {...props} />;
}

function isDesktopMenu(wide: boolean): boolean {
  return wide && Platform.OS === 'web';
}

function ConfigurationContents(props: ContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 wide:p-3">
      <ConfigurationFields {...props} />
    </View>
  );
}

// GroupedList takes its sections, and each section its rows, as direct children, so these are called rather than rendered.
function ConfigurationFields(props: ContentsProps): React.JSX.Element {
  return (
    <PopoverHoverGroup>
      <GroupedList fit={Platform.OS === 'web' || props.wide}>
        {props.wide && (
          <Text role="heading" aria-level={2} className="px-4 pt-1">
            Configure
          </Text>
        )}
        {configurationDrills(props)}
        {configurationTuning(props.configuration)}
      </GroupedList>
    </PopoverHoverGroup>
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

const drillsNotice = (
  configuration: ComposerConfigurationProps,
): string | undefined =>
  hasTuning(configuration) ? undefined : configurationNotice(configuration);

function configurationDrills(props: ContentsProps): React.JSX.Element {
  const drillProps = {
    configuration: props.configuration,
    onOpenPage: props.openPage,
  };

  return (
    <GroupedListSection footer={drillsNotice(props.configuration)}>
      <ConfigurationDrill {...drillProps} page="agent" />
      {hasDrillOption({ ...drillProps, page: 'model' }) && (
        <ConfigurationDrill {...drillProps} page="model" />
      )}
    </GroupedListSection>
  );
}

function configurationTuning(
  configuration: ComposerConfigurationProps,
): React.JSX.Element | null {
  if (!hasTuning(configuration)) return null;

  return (
    <GroupedListSection footer={configurationNotice(configuration)}>
      {switchRows(configuration)}
      {effortRow(configuration)}
    </GroupedListSection>
  );
}
