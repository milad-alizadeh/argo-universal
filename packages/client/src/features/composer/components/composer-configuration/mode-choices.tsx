import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { View } from 'react-native';
import { choiceOptions, configurationPicker } from './configuration-picker';
import { selection } from './configuration-values';
import type { ModeContentsProps } from './mode-types';

/*
 * A mode is the Agent's own word, not Argo's: ACP sends it as a value, a name and a description and nothing
 * else. Any glyph beside it would be Argo guessing at one Agent's vocabulary, so the row is its name, its
 * description and its check (owner, 2026-10-20).
 */
export function ModeContents(props: ModeContentsProps): React.JSX.Element {
  return (
    <View className="native:flex-1 bg-content">
      <FieldGroup>
        {modeSection(props)}
        {collaborationSection(props)}
      </FieldGroup>
    </View>
  );
}

// Choosing a mode leaves Configure's Mode, as the choice is the page's one job.
function modeSection(props: ModeContentsProps): React.JSX.Element {
  return (
    <FieldGroup.Section key="modes">
      <FieldGroup.Picker
        title="Mode"
        presentation="inline"
        value={props.mode.currentValue}
        options={choiceOptions(props.mode)}
        onValueChange={(value) => chooseMode(props, value)}
      />
    </FieldGroup.Section>
  );
}

function chooseMode(
  { configuration, mode, close }: ModeContentsProps,
  value: string,
): void {
  configuration.onConfigChange(mode.configId, value);
  close();
}

function collaborationSection(
  props: ModeContentsProps,
): React.JSX.Element | null {
  const option = selection(props.configuration, 'collaboration_mode');

  if (!option) return null;

  return (
    <FieldGroup.Section key="collaboration">
      {configurationPicker({
        configuration: props.configuration,
        option,
        title: option.name,
      })}
    </FieldGroup.Section>
  );
}
