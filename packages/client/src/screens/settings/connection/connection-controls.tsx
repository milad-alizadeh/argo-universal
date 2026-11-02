import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';

// Whether the Server outlives the desktop app that started it. Absent on a paired Device, which may not change it (Server Device only, ADR-0022).
export interface KeepRunningSetting {
  enabled: boolean;
  // A change that failed shows its toast; the switch stays where the Server has it.
  error?: string;
  onChange: (enabled: boolean) => void;
}

// Whether other Devices on the network may reach the Server, which Pairing needs (ADR-0045). Server Device only, like keeping the Server running.
export interface LocalAccessSetting {
  enabled: boolean;
  // What other Devices find this computer as; absent until the Server has listed its Devices.
  computerName?: string;
  error?: string;
  onChange: (enabled: boolean) => void;
}

// Ends the Server on this computer. Absent where the App has no way to stop it.
export interface StopServerSetting {
  onStop: () => void;
}

export interface OwnerControls {
  keepRunning?: KeepRunningSetting;
  localAccess?: LocalAccessSetting;
  stopServer?: StopServerSetting;
}

const localAccessOff =
  'Off. Only this computer can reach Argo, and Devices can’t be paired. Turn it on to let other Devices on your network find this computer; each one still has to be paired and allowed here first.';

const asName = (name?: string): string => (name ? ` as “${name}”` : '');

const localAccessOn = (name?: string): string =>
  `On. Devices on this network can find this computer${asName(name)}. Nothing connects until you pair it in Devices and allow it here. Turn this off and no other Device can reach Argo, paired or not.`;

const localAccessFooter = (setting: LocalAccessSetting): string =>
  setting.enabled ? localAccessOn(setting.computerName) : localAccessOff;

export const localAccessSection = (
  setting?: LocalAccessSetting,
): React.JSX.Element | null =>
  setting ? (
    <FieldGroup.Section footer={localAccessFooter(setting)}>
      <FieldGroup.Toggle
        title="Local network access"
        value={setting.enabled}
        onValueChange={setting.onChange}
      />
    </FieldGroup.Section>
  ) : null;

export const keepRunningSection = (
  setting?: KeepRunningSetting,
): React.JSX.Element | null =>
  setting ? (
    <FieldGroup.Section footer="On. Quitting Argo leaves the Server running, so a paired Device keeps working.">
      <FieldGroup.Toggle
        title="Keep the Server running"
        value={setting.enabled}
        onValueChange={setting.onChange}
      />
    </FieldGroup.Section>
  ) : null;

// The red row opens the question; the Server stops only when the owner answers it.
export const stopServerSection = (
  ask?: () => void,
): React.JSX.Element | null =>
  ask ? (
    <FieldGroup.Section footer="Stops the Server on this computer. Paired Devices lose their Sessions until it starts again. Argo starts it again the next time you open the app.">
      <Button label="Stop Server" variant="danger" onPress={ask} />
    </FieldGroup.Section>
  ) : null;
