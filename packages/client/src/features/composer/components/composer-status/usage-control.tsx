import type { JSX } from 'react';
import { Platform, View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '#primitives/display/icon';
import type { ComposerStatusProps, UsageLimit } from '../../utils/status';
import { ComposerPopover } from '../composer-popover/composer-popover';
import {
  ControlLabel,
  createStatusControlTrigger,
} from './status-control-trigger';
import { Meter } from './status-meter';
import {
  mutedTextClassName,
  unselectableTextClassName,
} from './status-surface';
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

// A phone's sheet page header already reads "Usage".
function UsageContent({ usage }: Pick<UsageProps, 'usage'>): JSX.Element {
  return (
    <View className="pt-1 wide:pt-3">
      {Platform.OS === 'web' && <UsageHeading />}
      {usage.limits.map((limit) => (
        <UsageLimitRow key={limit.label} limit={limit} />
      ))}
    </View>
  );
}

// A tablet's larger type leaves no room for the word on a medium window (#927).
function UsageWord({ wide }: Pick<UsageProps, 'wide'>): JSX.Element {
  return (
    <ControlLabel label="Usage" wide={wide} className="hidden wide-type:flex" />
  );
}

function UsageTriggerContent({ usage, wide }: UsageProps): JSX.Element {
  const percentClass = cn(unselectableTextClassName, !wide && 'hidden');

  return (
    <>
      <Icon role="control" name="usage" className={mutedTextClassName} />
      <UsageWord wide={wide} />
      <StatusText role="secondary" className={percentClass}>
        {usage.limits[0]?.usedPercent}%
      </StatusText>
    </>
  );
}

function createUsageTrigger(props: UsageProps): JSX.Element {
  return createStatusControlTrigger({
    ...props,
    label: 'Usage',
    children: <UsageTriggerContent {...props} />,
  });
}

export function UsageControl(props: UsageProps): JSX.Element {
  return (
    <ComposerPopover
      label="Usage"
      width={320}
      trigger={createUsageTrigger(props)}
    >
      {() => <UsageContent usage={props.usage} />}
    </ComposerPopover>
  );
}
