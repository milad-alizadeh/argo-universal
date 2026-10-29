import { ListSection } from '@repo/kit/primitives/lists/list';
import { ListItem } from '@repo/kit/primitives/lists/list-item';
import type { JSX } from 'react';
import { View } from 'react-native';
import type { ComposerStatusProps, UsageLimit } from '../../utils/status';
import { ComposerPopover } from '../composer-popover/composer-popover';
import { createStatusControlTrigger } from './status-control-trigger';
import { Meter } from './status-meter';
import { phoneSheet, StatusSheetList } from './status-surface';
import { StatusText } from './status-text';

interface UsageProps {
  usage: NonNullable<ComposerStatusProps['usage']>;
  disabled: boolean;
  wide: boolean;
}

function UsageLimitValues({ limit }: { limit: UsageLimit }): JSX.Element {
  return (
    <View className="flex-row justify-between">
      <StatusText role="body" className="select-none">
        {limit.label}
      </StatusText>
      <StatusText role="body" className="select-none">
        {limit.usedPercent}%
      </StatusText>
    </View>
  );
}

function UsageLimitRow({ limit }: { limit: UsageLimit }): JSX.Element {
  return (
    <View className="px-4 py-3 gap-1.5">
      <UsageLimitValues limit={limit} />
      <Meter percent={limit.usedPercent} />
      <StatusText role="secondary" className="select-none">
        {limit.resets}
      </StatusText>
    </View>
  );
}

function UsageHeading(): JSX.Element {
  return (
    <View className="px-4 gap-1 pb-3">
      <StatusText role={'heading'} className="select-none">
        Usage
      </StatusText>
    </View>
  );
}

// A phone's sheet: its page header already reads "Usage", and the limits sit in one grouped card, as Settings' rows.
function UsageSheetContent({ usage }: Pick<UsageProps, 'usage'>): JSX.Element {
  return (
    <StatusSheetList>
      <ListSection>{usage.limits.map(usageLimitItem)}</ListSection>
    </StatusSheetList>
  );
}

function usageLimitItem(limit: UsageLimit): JSX.Element {
  return (
    <ListItem
      key={limit.label}
      title={limit.label}
      value={`${limit.usedPercent}%`}
      subtitle={limit.resets}
      control={<Meter percent={limit.usedPercent} />}
    />
  );
}

function UsageContent({ usage }: Pick<UsageProps, 'usage'>): JSX.Element {
  if (phoneSheet) return <UsageSheetContent usage={usage} />;

  return (
    <View className="pt-1 wide:pt-3">
      <UsageHeading />
      {usage.limits.map((limit) => (
        <UsageLimitRow key={limit.label} limit={limit} />
      ))}
    </View>
  );
}

function createUsageTrigger(props: UsageProps): JSX.Element {
  return createStatusControlTrigger({
    ...props,
    label: 'Usage',
    icon: 'usage',
    detail: `${props.usage.limits[0]?.usedPercent}%`,
  });
}

export function UsageControl(props: UsageProps): JSX.Element {
  return (
    <ComposerPopover
      label="Usage"
      width={320}
      listContent={phoneSheet}
      trigger={createUsageTrigger(props)}
    >
      {() => <UsageContent usage={props.usage} />}
    </ComposerPopover>
  );
}
