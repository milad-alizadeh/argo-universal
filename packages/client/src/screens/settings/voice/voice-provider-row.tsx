import type { VoiceAvailability, VoiceSettings } from '@repo/contracts';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import type { VoiceDetailViewProps } from './voice-detail-view-props';
import { chosenProvider, settingsOf, waiting } from './voice-settings-state';

const reasonOf = (
  availability: VoiceAvailability | undefined,
): string | undefined =>
  availability?.usable === false ? availability.reason : undefined;

// Why the chosen provider cannot be used, when it cannot.
export const providerReason = (
  props: VoiceDetailViewProps,
): string | undefined =>
  reasonOf(chosenProvider(settingsOf(props))?.availability);

const providerOptions = (
  settings: VoiceSettings,
): React.ComponentProps<typeof FieldGroup.Picker>['options'] =>
  settings.providers.map((provider) => ({
    value: provider.id,
    label: provider.experimental
      ? `${provider.label} (experimental)`
      : provider.label,
  }));

// Called, not rendered: the FieldGroup reads its rows by element type.
export const providerRow = (props: VoiceDetailViewProps): React.JSX.Element => (
  <FieldGroup.Picker
    key="provider"
    title="Voice provider"
    presentation="menu"
    value={settingsOf(props).provider ?? ''}
    options={providerOptions(settingsOf(props))}
    disabled={waiting(props)}
    onValueChange={props.onProviderChange}
  />
);
