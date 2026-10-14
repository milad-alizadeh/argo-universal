import type * as React from 'react';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Text } from '#primitives/display/text';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { PopoverHoverGroup } from '#primitives/overlays/popover';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';
import { ConfigurationDrill } from './configuration-drill';
import { ConfigurationPage } from './configuration-page';
import { EffortControl, SwitchOptions } from './configuration-tuning';
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
    <View className="native:flex-1 wide:p-3 bg-content">
      <ConfigurationFields {...props} />
    </View>
  );
}

function ConfigurationFields(props: ContentsProps): React.JSX.Element {
  return (
    <GroupedList fit={Platform.OS === 'web' || props.wide}>
      {props.wide && (
        <Text role="heading" aria-level={2} className="px-4 pt-1">
          Configure
        </Text>
      )}
      <ConfigurationDrills {...props} />
      <ConfigurationTuning configuration={props.configuration} />
    </GroupedList>
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

function ConfigurationDrills(props: ContentsProps): React.JSX.Element {
  const notice = hasTuning(props.configuration)
    ? undefined
    : configurationNotice(props.configuration);

  return (
    <PopoverHoverGroup>
      <GroupedListSection footer={notice}>
        <ConfigurationDrillRows {...props} />
      </GroupedListSection>
    </PopoverHoverGroup>
  );
}

function ConfigurationDrillRows(props: ContentsProps): React.JSX.Element {
  const drillProps = {
    configuration: props.configuration,
    onOpenPage: props.openPage,
  };

  return (
    <>
      <ConfigurationDrill {...drillProps} page="agent" />
      <ConfigurationDrill {...drillProps} page="model" />
    </>
  );
}

function ConfigurationTuning({
  configuration,
}: Pick<MenuProps, 'configuration'>): React.JSX.Element | null {
  if (!hasTuning(configuration)) return null;

  return (
    <GroupedListSection footer={configurationNotice(configuration)}>
      <SwitchOptions configuration={configuration} />
      <EffortControl configuration={configuration} />
    </GroupedListSection>
  );
}
