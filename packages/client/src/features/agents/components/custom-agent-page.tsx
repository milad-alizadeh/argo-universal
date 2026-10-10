import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';
import {
  type CustomAgentCheck,
  CustomAgentStatus,
  ReadinessChip,
} from './custom-agent-status';
import { keyedRows } from './keyed-rows';

export type CustomAgentPageProps = {
  definition: CustomAgentDefinition;
  check: CustomAgentCheck;
  onCheck: () => void;
  // The Launch section: read-only values, or the edit form in their place.
  launch: React.ReactNode;
};

export function CustomAgentPage(
  props: CustomAgentPageProps,
): React.JSX.Element {
  const { definition, check } = props;
  return (
    <View className="gap-8">
      <PageHeader name={definition.name} check={check} />
      <Section title="Status">
        <CustomAgentStatus check={check} onCheck={props.onCheck} />
      </Section>
      {props.launch}
    </View>
  );
}

// Desktop sets the tile beside the name; a phone centres the summary as in Paper.
function PageHeader(props: {
  name: string;
  check: CustomAgentCheck;
}): React.JSX.Element {
  return (
    <View className="items-center gap-3 wide:flex-row">
      <AgentTile />
      <View className="items-center gap-1 wide:flex-1 wide:items-start">
        <PageTitle {...props} />
        <Text role="secondary">Custom ACP program</Text>
      </View>
    </View>
  );
}

function AgentTile(): React.JSX.Element {
  return (
    <View className="size-16 items-center justify-center rounded-2xl bg-muted wide:size-12 wide:rounded-lg">
      <Icon name="agent" className="text-foreground" />
    </View>
  );
}

function PageTitle(props: {
  name: string;
  check: CustomAgentCheck;
}): React.JSX.Element {
  return (
    <View className="items-center gap-1 wide:flex-row wide:gap-2">
      <Text semanticRole="heading" aria-level={1} role={'heading'}>
        {props.name}
      </Text>
      <ReadinessChip check={props.check} />
    </View>
  );
}

type SectionProps = {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

export function Section(props: SectionProps): React.JSX.Element {
  return (
    <View className="gap-3">
      <SectionHeader title={props.title} action={props.action} />
      {props.children}
    </View>
  );
}

function SectionHeader({
  title,
  action,
}: Pick<SectionProps, 'title' | 'action'>): React.JSX.Element {
  return (
    <View className="h-8 flex-row items-center justify-between">
      <Text semanticRole="heading" aria-level={2} role={'heading'}>
        {title}
      </Text>
      {action}
    </View>
  );
}

export function LaunchValues({
  definition,
}: {
  definition: CustomAgentDefinition;
}): React.JSX.Element {
  const env = definition.env.map(({ name, value }) => `${name}=${value}`);
  return (
    <View className="gap-4">
      <LaunchValue label="Executable" values={[definition.executable]} />
      <LaunchValue label="Arguments" values={definition.args} />
      <LaunchValue label="Environment variables" values={env} />
    </View>
  );
}

function LaunchValue({
  label,
  values,
}: {
  label: string;
  values: string[];
}): React.JSX.Element {
  return (
    <View className="gap-1">
      <Text role="body">{label}</Text>
      <ValueLines values={values} />
    </View>
  );
}

function ValueLines({ values }: { values: string[] }): React.JSX.Element {
  const rows = keyedRows(values);
  if (rows.length === 0) return <Text role="secondary">None</Text>;
  return (
    <>
      {rows.map((row) => (
        <ValueLine key={row.key} value={row.value} />
      ))}
    </>
  );
}

function ValueLine({ value }: { value: string }): React.JSX.Element {
  return (
    <Text role="code" className="text-muted-foreground" selectable>
      {value}
    </Text>
  );
}
