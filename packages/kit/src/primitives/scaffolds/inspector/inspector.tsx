import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useClaim, useOfferedPlace, type Place } from '#kit/place';
import { useDrawnPage } from '#kit/use-shown-page';
import { useWide } from '#kit/use-wide/use-wide';
import { InspectorPane } from './inspector-pane';
import { InspectorPlaceOffer, NativeInspectorPlace } from './inspector-place';
import type { InspectorProps } from './inspector-props';
import { InspectorSheet } from './inspector-sheet';

/*
 * Foundations / Inspector: secondary detail about what is open. On a wide window it is its own column: in the App
 * Frame's column, flush with the window's right edge, or in place where no Frame offers one. Under wide the same
 * children open in a Sheet. A page's own header action opens it; there is no generic toggle.
 */
export function Inspector(props: InspectorProps): ReactElement | null {
  const place = useOfferedPlace(InspectorPlaceOffer);
  const nativePlace = use(NativeInspectorPlace);
  const focused = useDrawnPage();
  const wide = useWide();

  if (nativePlace)
    return (
      <HostedInspector {...props} place={focused ? nativePlace : undefined} />
    );

  if (!wide) return <InspectorSheet {...props} />;

  const pane = { ...props, scrollable: undefined };

  if (place) return <HostedInspector {...pane} place={place} />;

  return <InspectorColumn {...pane} />;
}

// The Frame draws it, with its expand and its width; the page draws nothing here.
function HostedInspector({
  place,
  ...props
}: InspectorProps & { place: Place<InspectorProps> | undefined }): null {
  useClaim(place, props);

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
