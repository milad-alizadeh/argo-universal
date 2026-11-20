import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { SettingsLoading } from '#features/settings';
import type { SlotDetail } from './slot-detail';
import { type SlotPlugin, visibilityOf } from './slot-detail-model';
import type { SlotPluginsLoad } from './slot-plugins';
import { SlotPreview } from './slot-preview';

export interface SlotDetailViewProps {
  settings: SlotDetail;
  plugins: SlotPluginsLoad;
  onShownChange: (pluginId: string, shown: boolean) => void;
  onBack?: () => void;
}

const loadFailed: ErrorToast = {
  title: 'Could not load Plugins',
  message: 'The Server did not send its Plugins.',
};

/*
 * Any Slot's page, drawn from its declaration: which Plugins fill it. The preview is the Slot's own component, pinned
 * below the rows that change it, and redraws as each one changes.
 */
export function SlotDetailView(props: SlotDetailViewProps): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen title={props.settings.title} onBack={props.onBack}>
      {body(props)}
    </Screen>
  );
}

// Called, not rendered, so the Screen sees the switches and the preview as two parts: one fills, one keeps its height.
function body(props: SlotDetailViewProps): React.JSX.Element {
  if (props.plugins.status !== 'loaded')
    return <SettingsLoading label="Loading Plugins…" />;

  return loaded({ ...props, plugins: props.plugins.plugins });
}

type LoadedProps = Omit<SlotDetailViewProps, 'plugins'> & {
  plugins: SlotPlugin[];
};

const loaded = (props: LoadedProps): React.JSX.Element => (
  <>
    <FieldGroup key="switches">{showSection(props)}</FieldGroup>
    <SlotPreview
      key="preview"
      settings={props.settings}
      visibility={visibilityOf(props.plugins)}
    />
  </>
);

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const showSection = ({
  settings,
  plugins,
  onShownChange,
}: LoadedProps): React.JSX.Element => (
  <FieldGroup.Section title={settings.showTitle}>
    {plugins.map((plugin) => switchRow(plugin, onShownChange))}
  </FieldGroup.Section>
);

const switchRow = (
  plugin: SlotPlugin,
  onShownChange: LoadedProps['onShownChange'],
): React.JSX.Element => (
  <FieldGroup.Toggle
    key={plugin.pluginId}
    title={plugin.name}
    value={plugin.shown}
    onValueChange={(shown) => onShownChange(plugin.pluginId, shown)}
  />
);
