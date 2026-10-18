import {
  composerAboveSlotId,
  type ReplaceableInput,
} from '@repo/contracts/plugins/replaceable';
import type { ComposerStatusProps, ComposerWork } from '../../utils/status';
import type { TopTrayLayout } from './composer-tray-types';

type TrayInput = Extract<
  ReplaceableInput,
  { slotId: typeof composerAboveSlotId }
>;

type TrayProps = TrayInput['props'];

export function trayInput({ wide, inactive, props }: TopTrayLayout): TrayInput {
  return {
    slotId: composerAboveSlotId,
    props: {
      wide,
      inactive,
      writtenPlan: props.writtenPlan,
      status: trayStatus(props.status),
    },
  };
}

function trayStatus(
  status: ComposerStatusProps | undefined,
): TrayProps['status'] {
  if (!status) return undefined;

  return {
    plan: status.plan,
    subagents: workData(status.subagents),
    shells: workData(status.shells),
  };
}

const workData = (
  work: ComposerWork | undefined,
): Pick<ComposerWork, 'count' | 'running'> | undefined =>
  work ? { count: work.count, running: work.running } : undefined;

export function rewrittenTray(
  layout: TopTrayLayout,
  props: TrayProps,
): TopTrayLayout {
  return {
    ...layout,
    wide: props.wide,
    inactive: props.inactive,
    props: {
      ...layout.props,
      writtenPlan: props.writtenPlan,
      status: rewrittenStatus(layout.props.status, props.status),
    },
  };
}

function rewrittenStatus(
  core: ComposerStatusProps | undefined,
  status: TrayProps['status'],
): ComposerStatusProps | undefined {
  if (!status) return undefined;

  return {
    ...core,
    plan: status.plan,
    subagents: rewrittenWork(coreWork(core, 'subagents'), status.subagents),
    shells: rewrittenWork(coreWork(core, 'shells'), status.shells),
  };
}

function rewrittenWork(
  core: ComposerWork | undefined,
  work: ReturnType<typeof workData>,
): ComposerWork | undefined {
  if (!core || !work) return undefined;

  return { ...core, ...work };
}

const coreWork = (
  status: ComposerStatusProps | undefined,
  name: 'subagents' | 'shells',
): ComposerWork | undefined => status?.[name];
