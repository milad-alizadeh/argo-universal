import { Dimensions, Platform } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { useInCompactScope } from './compact-scope';
import { type SizeClass, sizeClass } from './size-class';

// Android's own phone/tablet split: a tablet's shorter screen side is 600dp or more (sw600dp).
const androidTabletShortSide = 600;

// The device idiom, not the window: iOS says iPad; Android reads the screen's shorter side.
function isPhone(): boolean {
  if (Platform.OS === 'ios') return !Platform.isPad;

  const screen = Dimensions.get('screen');

  return Math.min(screen.width, screen.height) < androidTabletShortSide;
}

const reaches = (resolved: { display?: unknown }): boolean =>
  resolved.display === 'flex';

// The breakpoints come from tooling/uniwind/theme.css through Uniwind's own variants; a system sheet's content is compact.
export function useSizeClass(): SizeClass {
  const shown = sizeClass({
    medium: reaches(useResolveClassNames('hidden medium:flex')),
    wide: reaches(useResolveClassNames('hidden wide-type:flex')),
    phone: isPhone(),
  });

  return useInCompactScope() ? 'compact' : shown;
}
