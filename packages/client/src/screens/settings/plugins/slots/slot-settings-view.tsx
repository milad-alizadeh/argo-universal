import { groupedRowInset } from '@repo/kit/heading-inset';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import {
  ScrollColumnContext,
  useScrollColumnStyle,
} from '@repo/kit/scroll-column';
import type * as React from 'react';
import { use } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { SettingsLoading } from '../../settings-loading';
import type { SlotPluginsLoad } from './slot-plugins';
import { SlotPreview } from './slot-preview';
import type { OwnerSlot, SlotSettings } from './slot-settings';
import {
  effectiveOwner,
  fillingPlugins,
  optionValueOf,
  ownerOfOption,
  ownerOptions,
  type SlotOwner,
  type SlotPlugin,
  visibilityOf,
} from './slot-settings-model';

export interface SlotSettingsViewProps {
  settings: SlotSettings;
  caption?: string;
  plugins: SlotPluginsLoad;
  // The Plugin that writes the Slot's Single-owner Slot, or null while it is Argo's.
  owner: SlotOwner;
  onShownChange: (pluginId: string, shown: boolean) => void;
  onOwnerChange: (owner: SlotOwner) => void;
  onBack?: () => void;
}

const loadFailed: ErrorToast = {
  title: 'Could not load Plugins',
  message: 'The Server did not send its Plugins.',
};

/*
 * Any Slot's page, drawn from its declaration: which Plugins fill it, and who writes its Single-owner Slot. The
 * preview is the Slot's own component, pinned above the rows that change it, and redraws as each one changes.
 */
export function SlotSettingsView(
  props: SlotSettingsViewProps,
): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen
      title={props.settings.title}
      caption={props.caption}
      onBack={props.onBack}
    >
      <Body {...props} />
    </Screen>
  );
}

function Body(props: SlotSettingsViewProps): React.JSX.Element {
  if (props.plugins.status !== 'loaded')
    return <SettingsLoading label="Loading Plugins…" />;

  return <Loaded {...props} plugins={props.plugins.plugins} />;
}

type LoadedProps = Omit<SlotSettingsViewProps, 'plugins'> & {
  plugins: SlotPlugin[];
};

const Loaded = (props: LoadedProps): React.JSX.Element => (
  <View className="min-h-0 flex-1">
    <View className="pt-2 pb-1" style={usePreviewColumn()}>
      <SlotPreview
        settings={props.settings}
        visibility={visibilityOf(props.plugins, props.owner)}
      />
    </View>
    <FieldGroup>
      {showSection(props)}
      {props.settings.ownerSlot &&
        ownerSection(props, props.settings.ownerSlot)}
    </FieldGroup>
  </View>
);

/*
 * The preview card lines up with the section cards under it: in a wide pane's column they stand out of it by the
 * rows' inset, and on a phone they keep the page's gutter.
 */
function usePreviewColumn(): StyleProp<ViewStyle> {
  const inColumn = use(ScrollColumnContext) !== undefined;

  return useScrollColumnStyle(inColumn ? outOfColumn : phoneGutter);
}

const outOfColumn: ViewStyle = {
  paddingLeft: -groupedRowInset,
  paddingRight: -groupedRowInset,
};

const phoneGutter: ViewStyle = { paddingHorizontal: groupedRowInset };

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const showSection = ({
  settings,
  plugins,
  onShownChange,
}: LoadedProps): React.JSX.Element => (
  <FieldGroup.Section title={settings.showTitle}>
    {fillingPlugins(plugins).map((plugin) => switchRow(plugin, onShownChange))}
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

const ownerSection = (
  props: LoadedProps,
  ownerSlot: OwnerSlot,
): React.JSX.Element => (
  <FieldGroup.Section title={ownerSlot.title}>
    <FieldGroup.Picker
      title={ownerSlot.title}
      presentation="inline"
      value={chosenOption(props)}
      options={ownerOptions(ownerSlot, props.plugins, props.owner)}
      onValueChange={(value) => props.onOwnerChange(ownerOfOption(value))}
    />
  </FieldGroup.Section>
);

// A Plugin turned off gives the line back to Argo, so its option is not the chosen one.
const chosenOption = ({ plugins, owner }: LoadedProps): string =>
  optionValueOf(effectiveOwner(plugins, owner)?.pluginId ?? null);
