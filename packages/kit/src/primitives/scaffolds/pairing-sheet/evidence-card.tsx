import type { IconName } from '@repo/contracts/kit-symbols';
import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

export interface EvidenceCardProps {
  icon: IconName;
  // The route up to the setting, muted.
  lead: string;
  // The setting itself, in bold.
  detail: string;
}

/*
 * Where in Settings the owner acts, on a grey card under a pairing sheet's words.
 */
export function EvidenceCard(props: EvidenceCardProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-muted px-4 py-3.5">
      <Icon name={props.icon} size="md" tone="muted" />
      <View className="shrink">
        <Text role="secondary" tone="muted">
          {props.lead}
        </Text>
        <Text role="secondary" className="font-semibold">
          {props.detail}
        </Text>
      </View>
    </View>
  );
}

export interface CodeBlockProps {
  // The file the lines belong in.
  label: string;
  // The key to add, then its value.
  name: string;
  value: string;
}

/*
 * What a developer adds to a file, as the dark block of code that says it.
 */
export function CodeBlock(props: CodeBlockProps): React.JSX.Element {
  return (
    <View className="gap-0.5 rounded-2xl bg-tone-neutral-900 px-4 py-3.5">
      <Text role="code" className="text-tone-neutral-400">
        {props.label}
      </Text>
      <Text role="code" className="mt-1.5 font-semibold text-code-light">
        {props.name}
      </Text>
      <Text role="code" className="text-tone-success-300">
        {props.value}
      </Text>
    </View>
  );
}
