import type { PlanEntry } from '@repo/contracts';
import type { JSX } from 'react';
import { View } from 'react-native';
import { useContentWide } from '#lib/product/content-layout';
import type { ComposerStatusProps } from '../../utils/status';
import { StatusPlan } from './composer-plan';
import { ContextControl } from './context-control';
import { UsageControl } from './usage-control';
import { WorkChips } from './work-chips';

export type { ComposerStatusProps } from '../../utils/status';

export interface StatusControlsProps {
  // The Session's Plan, Subagents, Shells, context and usage; each control draws only what it is given.
  status: ComposerStatusProps;
  disabled: boolean;
}

export function ComposerPlan(props: {
  entries: PlanEntry[];
  disabled: boolean;
}): JSX.Element {
  return <StatusPlan {...props} />;
}

export function ComposerStatusControls({
  status,
  disabled,
}: StatusControlsProps): JSX.Element {
  const wide = useContentWide();

  return <StatusControlsRow status={status} disabled={disabled} wide={wide} />;
}

/*
 * Usage is a desktop control. A phone's Composer row holds Attach, the Agent and model, the mark for the Session's
 * context and Mode's own name, and a second gauge for a limit that resets on its own clock took the room the
 * model's name needed; Usage keeps its place on a desktop and its page in Settings (owner, 2026-10-21).
 */
function StatusControlsRow({
  status,
  ...controlProps
}: StatusControlsProps & { wide: boolean }): JSX.Element {
  return (
    <View className="flex-row gap-1 items-center min-w-0">
      <StatusUsage usage={status.usage} {...controlProps} />
      {status.context && (
        <ContextControl context={status.context} {...controlProps} />
      )}
    </View>
  );
}

function StatusUsage({
  usage,
  ...controlProps
}: Pick<ComposerStatusProps, 'usage'> & {
  disabled: boolean;
  wide: boolean;
}): JSX.Element | null {
  if (!usage || !controlProps.wide) return null;

  return <UsageControl usage={usage} {...controlProps} />;
}

export function ComposerWorkChips(props: StatusControlsProps): JSX.Element {
  return <WorkChips {...props} />;
}
