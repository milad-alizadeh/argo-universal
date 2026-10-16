import type * as React from 'react';
import { useState } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Spinner } from '#primitives/display/spinner';
import { Text } from '#primitives/display/text';
import { Sheet } from '#primitives/overlays/sheet';
import { useWide } from '../../../use-wide/use-wide';
import type { CalloutProps } from './callout-props';

/*
 * A wide window draws the callout's content in place, for a tray such as the one behind the Composer's card.
 * A phone presents the same content as a bottom sheet.
 */
export function Callout(props: CalloutProps): React.JSX.Element {
  if (useWide()) return <WideCallout {...props} />;

  return <CalloutSheet {...props} />;
}

const contentOf = ({ title, description }: CalloutProps): string =>
  `${title}\n${description ?? ''}`;

// A swipe or Escape puts the sheet away until the callout says something new.
function CalloutSheet(props: CalloutProps): React.JSX.Element {
  const [dismissed, setDismissed] = useState<string>();
  const content = contentOf(props);

  return (
    <Sheet
      open={dismissed !== content}
      onOpenChange={(open) => setDismissed(open ? undefined : content)}
      label={props.title}
    >
      <PhoneCallout {...props} />
    </Sheet>
  );
}

function WideCallout(props: CalloutProps): React.JSX.Element {
  return (
    <View testID={props.testID} className="w-full gap-3 p-3">
      <View className="flex-row items-start gap-4">
        <CalloutText {...props} />
        {props.actions && (
          <View className="shrink-0 flex-row items-center gap-1">
            {props.actions}
          </View>
        )}
      </View>
      <CalloutDetail detail={props.detail} />
    </View>
  );
}

function PhoneCallout(props: CalloutProps): React.JSX.Element {
  return (
    <View testID={props.testID} className="w-full gap-4 px-4 pt-1">
      <View className="px-4">
        <CalloutText {...props} />
      </View>
      <CalloutDetail detail={props.detail} />
      {props.actions && <View className="gap-2">{props.actions}</View>}
    </View>
  );
}

function CalloutText(props: CalloutProps): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5 wide:pt-1">
      <CalloutTitle {...props} />
      {props.description && (
        <Text role="secondary" className="text-muted-foreground">
          {props.description}
        </Text>
      )}
    </View>
  );
}

const titleClassName = (tone: CalloutProps['tone']): string =>
  cn('min-w-0 flex-1 ios:type-nav-title', tone === 'danger' && 'text-danger');

function CalloutTitle(props: CalloutProps): React.JSX.Element {
  return (
    <View className="flex-row items-center gap-2">
      {props.busy && <Spinner accessibilityLabel={props.title} />}
      <Text
        role="heading"
        accessibilityRole="heading"
        aria-level={2}
        className={titleClassName(props.tone)}
      >
        {props.title}
      </Text>
    </View>
  );
}

function CalloutDetail({
  detail,
}: Pick<CalloutProps, 'detail'>): React.JSX.Element | null {
  if (!detail) return null;

  return (
    <View className="w-full rounded-xl bg-card px-3.5 py-2 shadow-card">
      <Text role="code" selectable>
        {detail}
      </Text>
    </View>
  );
}
