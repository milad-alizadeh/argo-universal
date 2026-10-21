import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useClaim } from '#kit/claim-store';
import { useWide } from '#kit/use-wide/use-wide';
import { type InspectorHost, InspectorHostContext } from './inspector-host';
import { InspectorPane } from './inspector-pane';
import type { InspectorProps } from './inspector-props';
import { InspectorSheet } from './inspector-sheet';

/*
 * Foundations / Inspector: secondary detail about what is open. On a wide window it is its own column: in the App
 * Frame's column, flush with the window's right edge, or in place where no Frame offers one. Under wide the same
 * children open in a Sheet. A page's own header action opens it; there is no generic toggle.
 */
export function Inspector(props: InspectorProps): ReactElement | null {
  const host = use(InspectorHostContext);

  if (!useWide()) return <InspectorSheet {...props} />;

  if (host) return <HostedInspector {...props} host={host} />;

  return <InspectorColumn {...props} />;
}

// The Frame draws it, with its expand and its width; the page draws nothing here.
function HostedInspector({
  host,
  ...props
}: InspectorProps & { host: InspectorHost }): null {
  useClaim(host, props);

  return null;
}

function InspectorColumn(props: InspectorProps): ReactElement | null {
  if (!props.open) return null;

  return (
    <View className="w-frame-inspector shrink-0 self-stretch">
      <InspectorPane {...props} />
    </View>
  );
}
