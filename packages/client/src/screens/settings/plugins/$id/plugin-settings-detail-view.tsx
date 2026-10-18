import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import type * as React from 'react';
import { View } from 'react-native';
import { SettingsPage } from '#lib/product/settings-page';
import { GroupedList } from '#primitives/lists/grouped-list';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { GroupedListSwitchItem } from '#primitives/lists/grouped-list-switch-item';
import { SettingFieldRow } from './plugin-setting-field-row';

export type PluginLoad =
  | { status: 'loading' }
  | { status: 'missing' }
  | {
      status: 'loaded';
      enabled: boolean;
      fields: readonly PluginSettingField[];
      settings: PluginSettings;
    };

export interface PluginSettingsDetailViewProps {
  // The Plugin's name, or its id until the Plugin loads.
  title: string;
  caption?: string;
  plugin: PluginLoad;
  onEnabledChange: (enabled: boolean) => void;
  onSettingChange: (key: string, value: PluginSettingValue) => void;
  onBack?: () => void;
}

export const enabledLabel = 'Enabled';

// One Plugin, as iOS Settings shows one App: its switch, then the settings its `contributes.settings` schema draws, one section per field.
export function PluginSettingsDetailView(
  props: PluginSettingsDetailViewProps,
): React.JSX.Element {
  return (
    <View className="flex-1 bg-content wide:bg-transparent">
      <SettingsPage
        title={props.title}
        caption={props.caption}
        onBack={props.onBack}
      >
        <GroupedList>
          <PluginBody {...props} />
        </GroupedList>
      </SettingsPage>
    </View>
  );
}

type BodyProps = Omit<PluginSettingsDetailViewProps, 'caption' | 'onBack'>;

function PluginBody(props: BodyProps): React.JSX.Element {
  const { plugin } = props;

  if (plugin.status !== 'loaded')
    return <UnloadedPlugin status={plugin.status} title={props.title} />;

  return (
    <>
      <GroupedListSection>
        <GroupedListSwitchItem
          label={enabledLabel}
          value={plugin.enabled}
          onValueChange={props.onEnabledChange}
        />
      </GroupedListSection>
      <SettingFields {...props} plugin={plugin} />
    </>
  );
}

type UnloadedProps = { status: 'loading' | 'missing'; title: string };

function UnloadedPlugin({ status, title }: UnloadedProps): React.JSX.Element {
  return (
    <GroupedListSection>
      {status === 'loading' ? (
        <GroupedListItem label="Loading the Plugin…" loading />
      ) : (
        <GroupedListItem label={`The Server has no Plugin named ${title}.`} />
      )}
    </GroupedListSection>
  );
}

type FieldsProps = Pick<BodyProps, 'onSettingChange'> & {
  plugin: Extract<PluginLoad, { status: 'loaded' }>;
};

function SettingFields({
  plugin,
  onSettingChange,
}: FieldsProps): React.JSX.Element[] {
  return plugin.fields.map((field) => (
    <SettingFieldRow
      key={field.key}
      field={field}
      settings={plugin.settings}
      onChange={(value) => onSettingChange(field.key, value)}
    />
  ));
}
