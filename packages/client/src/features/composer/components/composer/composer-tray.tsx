import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { View } from 'react-native';
import { ElicitationSheet, PermissionRequest } from '#features/requests';
import { filledClass, useSessionFill } from '#lib/product/session-fill';
import { PromptQueue } from '../prompt-queue/prompt-queue';
import { composerTrayClass } from './composer-tray-class';
import { ComposerPlans, hasTrayPlan } from './composer-trays';
import type { ComposerLayout } from './composer-types';

const trayClass = cn(
  composerTrayClass,
  '-mb-3 pb-3 rounded-t-2xl overflow-hidden',
);

interface TraySection {
  key: string;
  content: React.ReactNode;
  // The section that takes the height a filled Session column leaves.
  fills?: boolean;
}

// What sits above the card: a wide window's one tray, or a phone's queue and request.
export function ComposerTray(layout: ComposerLayout): React.JSX.Element | null {
  return layout.wide ? (
    <ComposerWideTray {...layout} />
  ) : (
    <ComposerPhoneStack {...layout} />
  );
}

/*
 * A wide window's one tray: the Plan, the Queued Prompts and the request or callout, stacked in that
 * order with a hairline between them.
 */
function ComposerWideTray(layout: ComposerLayout): React.JSX.Element | null {
  const fillClass = useSessionFill().filled ? filledClass : undefined;
  const sections = traySections(layout);

  if (!sections.length) return null;

  return (
    <View testID="composer-tray" className={cn(trayClass, fillClass)}>
      {sections.map((section, index) => sectionView(section, index, fillClass))}
    </View>
  );
}

const sectionView = (
  section: TraySection,
  index: number,
  fillClass: string | undefined,
): React.JSX.Element => (
  <View key={section.key} className={sectionClass(section, index, fillClass)}>
    {section.content}
  </View>
);

const sectionClass = (
  section: TraySection,
  index: number,
  fillClass: string | undefined,
): string =>
  cn(index > 0 && 'border-t border-border', section.fills && fillClass);

const traySections = (layout: ComposerLayout): TraySection[] =>
  [planSection(layout), queueSection(layout), requestSection(layout)].filter(
    (section) => section !== null,
  );

function planSection(layout: ComposerLayout): TraySection | null {
  if (!hasTrayPlan(layout)) return null;

  return { key: 'plan', content: <ComposerPlans {...layout} /> };
}

function queueSection({ props }: ComposerLayout): TraySection | null {
  const queue = props.promptQueue;

  if (!queue?.queue.items.length) return null;

  return { key: 'queue', content: <PromptQueue {...queue} /> };
}

function requestSection(layout: ComposerLayout): TraySection | null {
  const content = requestContent(layout);

  return content ? { key: 'request', content, fills: true } : null;
}

// A phone has no shared tray: its queue keeps a tray of its own, and a request is a sheet or a card.
function ComposerPhoneStack(layout: ComposerLayout): React.JSX.Element {
  return (
    <>
      <PhoneQueue {...layout} />
      <PhoneRequest {...layout} />
    </>
  );
}

function PhoneQueue(layout: ComposerLayout): React.JSX.Element | null {
  const section = queueSection(layout);

  return section && <View className={trayClass}>{section.content}</View>;
}

function PhoneRequest(layout: ComposerLayout): React.JSX.Element | null {
  const filled = useSessionFill().filled;
  const content = requestContent(layout);

  if (!content) return null;

  return <View className={cn('w-full', filled && filledClass)}>{content}</View>;
}

function requestContent({ props }: ComposerLayout): React.ReactNode {
  if (props.permissionRequest)
    return <PermissionRequest {...props.permissionRequest} />;

  if (props.elicitation)
    return (
      <ElicitationSheet
        key={props.elicitation.request.requestId}
        {...props.elicitation}
      />
    );

  return props.callout;
}
