import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { SettingsLoading } from '#features/settings';
import { settingFieldSection } from './plugin-setting-field-row';

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
  const { onBack, ...body } = props;

  return (
    <Screen title={props.title} onBack={onBack}>
      <PluginBody {...body} />
    </Screen>
  );
}

type BodyProps = Omit<PluginSettingsDetailViewProps, 'onBack'>;

function PluginBody(props: BodyProps): React.JSX.Element {
  const { plugin } = props;

  if (plugin.status === 'loading')
    return <SettingsLoading label="Loading the Plugin…" />;

  return <FieldGroup>{pluginSections(props, plugin)}</FieldGroup>;
}

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
function pluginSections(
  props: BodyProps,
  plugin: Exclude<PluginLoad, { status: 'loading' }>,
): React.JSX.Element {
  if (plugin.status === 'missing') return missingSection(props.title);

  return (
    <>
      {enabledSection(plugin, props.onEnabledChange)}
      {settingSections(plugin, props.onSettingChange)}
    </>
  );
}

type LoadedPlugin = Extract<PluginLoad, { status: 'loaded' }>;

const enabledSection = (
  plugin: LoadedPlugin,
  onEnabledChange: BodyProps['onEnabledChange'],
): React.JSX.Element => (
  <FieldGroup.Section>
    <FieldGroup.Toggle
      title={enabledLabel}
      value={plugin.enabled}
      onValueChange={onEnabledChange}
    />
  </FieldGroup.Section>
);

const missingSection = (title: string): React.JSX.Element => (
  <FieldGroup.Section>
    <FieldGroup.Value
      title={`The Server has no Plugin named ${title}.`}
      value=""
    />
  </FieldGroup.Section>
);

const settingSections = (
  plugin: LoadedPlugin,
  onSettingChange: BodyProps['onSettingChange'],
): React.JSX.Element[] =>
  plugin.fields.map((field) =>
    settingFieldSection({
      field,
      settings: plugin.settings,
      onChange: (value) => onSettingChange(field.key, value),
    }),
  );
