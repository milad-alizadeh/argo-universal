import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { IconButton } from '#primitives/actions/icon-button';
import {
  ScreenBesideList,
  ScreenDefaultBack,
} from './screen-navigation-context';
import type { ScreenProps } from './screen-props';

/*
 * A wide drill-in page's Back hangs in the margin left of the title, so titles line up with or without it, centred on
 * the title's line. A phone's stack header draws its own; beside its list a page needs none.
 */
export function ScreenBack({
  onBack,
}: Pick<ScreenProps, 'onBack'>): ReactElement | null {
  const back = useBack(onBack);

  if (!back) return null;

  return (
    <View className="absolute inset-y-0 -left-8 justify-center">
      <BackButton onBack={back} />
    </View>
  );
}

/*
 * A Screen's own Back on a wide drill-in page, as before; otherwise the host's default, which is there only for a page
 * the host pushed, so it is drawn beside a list too — drilling inside the detail pane is still something to come back
 * from. A phone's stack header draws its own either way.
 */
function useBack(onBack: ScreenProps['onBack']): (() => void) | null {
  const wide = useWide();
  const besideList = use(ScreenBesideList);
  const host = use(ScreenDefaultBack);

  if (!wide) return null;

  if (onBack) return besideList ? null : onBack;

  return host;
}

// A back glyph, not a chevron: a disclosure chevron draws smaller, and this is the page's one Back.
function BackButton({ onBack }: { onBack: () => void }): ReactElement {
  return (
    <IconButton
      icon="back"
      size="sm"
      variant="ghost"
      accessibilityLabel="Back"
      onPress={onBack}
    />
  );
}
