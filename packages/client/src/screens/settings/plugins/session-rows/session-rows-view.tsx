import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import {
  type ErrorToast,
  useErrorToast,
} from '@repo/kit/primitives/overlays/toast';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import type * as React from 'react';
import { View } from 'react-native';
import { SettingsLoading } from '../../settings-loading';
import {
  activityOptions,
  type ActivityOwner,
  effectiveOwner,
  optionValueOf,
  ownerOfOption,
  previewContent,
  type SessionRowsPlugin,
} from './session-rows-model';
import { SessionRowsPreview } from './session-rows-preview';

export type SessionRowsLoad =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; plugins: SessionRowsPlugin[] };

export interface SessionRowsViewProps {
  caption?: string;
  plugins: SessionRowsLoad;
  // The Plugin that writes the Activity line, or null while it is Argo's.
  activityOwner: ActivityOwner;
  onShownChange: (pluginId: string, shown: boolean) => void;
  onActivityOwnerChange: (owner: ActivityOwner) => void;
  onBack?: () => void;
}

export const sessionRowsTitle = 'Session rows';

export const showSectionTitle = 'Show on Session rows';

export const activitySectionTitle = 'Activity line';

const loadFailed: ErrorToast = {
  title: 'Could not load Plugins',
  message: 'The Server did not send its Plugins.',
};

/*
 * Which Plugins add to rows in the Sessions list, and who writes a row's Activity line. The preview stays pinned
 * above the rows that change it, and redraws as each one changes.
 */
export function SessionRowsView(
  props: SessionRowsViewProps,
): React.JSX.Element {
  useErrorToast(props.plugins.status === 'error' ? loadFailed : undefined);

  return (
    <Screen
      title={sessionRowsTitle}
      caption={props.caption}
      onBack={props.onBack}
    >
      <Body {...props} />
    </Screen>
  );
}

function Body(props: SessionRowsViewProps): React.JSX.Element {
  if (props.plugins.status !== 'loaded')
    return <SettingsLoading label="Loading Plugins…" />;

  return <Loaded {...props} plugins={props.plugins.plugins} />;
}

type LoadedProps = Omit<SessionRowsViewProps, 'plugins'> & {
  plugins: SessionRowsPlugin[];
};

const Loaded = (props: LoadedProps): React.JSX.Element => (
  <View className="min-h-0 flex-1">
    <View className="px-4 pt-2 pb-1">
      <SessionRowsPreview
        {...previewContent(props.plugins, props.activityOwner)}
      />
    </View>
    <FieldGroup>
      {showSection(props)}
      {activitySection(props)}
    </FieldGroup>
  </View>
);

// FieldGroup finds its sections by element type, so each is an element built here, not a component.
const showSection = ({
  plugins,
  onShownChange,
}: LoadedProps): React.JSX.Element => (
  <FieldGroup.Section title={showSectionTitle}>
    {plugins.map((plugin) => (
      <FieldGroup.Toggle
        key={plugin.pluginId}
        title={plugin.name}
        value={plugin.shown}
        onValueChange={(shown) => onShownChange(plugin.pluginId, shown)}
      />
    ))}
  </FieldGroup.Section>
);

const activityFooter = 'Only one Plugin writes the Activity line.';

const activitySection = (props: LoadedProps): React.JSX.Element => (
  <FieldGroup.Section title={activitySectionTitle} footer={activityFooter}>
    <FieldGroup.Picker
      title={activitySectionTitle}
      presentation="inline"
      value={chosenOption(props)}
      options={activityOptions(props.plugins, props.activityOwner)}
      onValueChange={(value) =>
        props.onActivityOwnerChange(ownerOfOption(value))
      }
    />
  </FieldGroup.Section>
);

// A Plugin turned off gives the line back to Argo, so its option is not the chosen one.
const chosenOption = ({ plugins, activityOwner }: LoadedProps): string =>
  optionValueOf(effectiveOwner(plugins, activityOwner)?.pluginId ?? null);
