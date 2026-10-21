import type {
  PluginSettingField,
  PluginSettingValue,
  PluginSettings,
} from '@repo/contracts/plugins';
import { List } from '@repo/kit/primitives/lists/list';
import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import { Page } from '@repo/kit/primitives/scaffolds/page';
import { Spinner } from '@repo/kit/primitives/status/spinner';
import type * as React from 'react';
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
  const { caption, onBack, ...body } = props;

  return (
    <Page title={props.title} caption={caption} onBack={onBack}>
      <List appearance="grouped">
        <PluginBody {...body} />
      </List>
    </Page>
  );
}

type BodyProps = Omit<PluginSettingsDetailViewProps, 'caption' | 'onBack'>;

function PluginBody(props: BodyProps): React.JSX.Element {
  const { plugin } = props;

  if (plugin.status !== 'loaded')
    return <UnloadedPlugin status={plugin.status} title={props.title} />;

  return (
    <>
      <EnabledSection {...props} plugin={plugin} />
      <SettingFields {...props} plugin={plugin} />
    </>
  );
}

type LoadedPlugin = Extract<PluginLoad, { status: 'loaded' }>;

type EnabledProps = Pick<BodyProps, 'onEnabledChange'> & {
  plugin: LoadedPlugin;
};

function EnabledSection(props: EnabledProps): React.JSX.Element {
  const { plugin, onEnabledChange } = props;

  return (
    <ListSection>
      <ListItem.Toggle
        title={enabledLabel}
        value={plugin.enabled}
        onValueChange={onEnabledChange}
      />
    </ListSection>
  );
}

type UnloadedProps = { status: 'loading' | 'missing'; title: string };

function UnloadedPlugin({ status, title }: UnloadedProps): React.JSX.Element {
  return (
    <ListSection>
      {status === 'loading' ? (
        <ListItem
          title="Loading the Plugin…"
          leading={<Spinner accessibilityLabel="Loading" />}
        />
      ) : (
        <ListItem title={`The Server has no Plugin named ${title}.`} />
      )}
    </ListSection>
  );
}

type FieldsProps = Pick<BodyProps, 'onSettingChange'> & {
  plugin: LoadedPlugin;
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
