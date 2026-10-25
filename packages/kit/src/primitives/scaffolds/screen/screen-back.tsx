import { use, type ReactElement } from 'react';
import { View } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { IconButton } from '#primitives/actions/icon-button';
import { ScreenBesideList } from './screen-navigation-context';
import type { ScreenProps } from './screen-props';

/*
 * A wide drill-in page's Back hangs in the margin left of the title, so titles line up with or without it, centred on
 * the title's line. A phone's stack header draws its own; beside its list a page needs none.
 */
export function ScreenBack({
  onBack,
}: Pick<ScreenProps, 'onBack'>): ReactElement | null {
  const shown = useBackShown();

  if (!onBack || !shown) return null;

  return (
    <View className="absolute inset-y-0 -left-8 justify-center">
      <BackButton onBack={onBack} />
    </View>
  );
}

function useBackShown(): boolean {
  const wide = useWide();
  const besideList = use(ScreenBesideList);

  return wide && !besideList;
}

// Its chevron follows the page title beside it.
function BackButton({ onBack }: { onBack: () => void }): ReactElement {
  return (
    <IconButton
      icon="chevron-left"
      size="sm"
      variant="ghost"
      accessibilityLabel="Back"
      onPress={onBack}
    />
  );
}
