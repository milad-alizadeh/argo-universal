import { Platform } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { headerPlan, type HeaderKind, type HeaderPlan } from './header-site';
import { useListColumnHeading } from './screen-list-column';
import { useScreenNavigator } from './screen-navigation-context';

// Reads the facts around a Screen once and decides where its header draws; nothing else asks them.
export function useHeaderPlan(kind: HeaderKind): HeaderPlan {
  const listColumn = Boolean(useListColumnHeading());
  const navigator = useScreenNavigator();
  const wide = useWide();

  return headerPlan({
    kind,
    listColumn,
    navigator,
    wide,
    web: Platform.OS === 'web',
  });
}
