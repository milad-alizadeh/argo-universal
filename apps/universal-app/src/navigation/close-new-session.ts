import { withoutNewSession } from '@repo/client';
import { useSizeClass } from '@repo/client/size-class';
import type { Stack } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import type { ComponentProps } from 'react';

type PageListeners = NonNullable<
  ComponentProps<typeof Stack.Screen>['listeners']
>;

const noListeners: PageListeners = {};

// Drops New Session from the section's stack, which closes its empty Session.
function closeNewSession(navigation: NavigationProp<ParamListBase>): void {
  const pages = navigation.getState();
  const next = withoutNewSession(pages);

  if (next)
    navigation.dispatch({
      ...CommonActions.reset({ ...pages, ...next }),
      target: pages.key,
    });
}

/*
 * Beside the list, on a medium or wide window, hiding Sessions closes New Session's empty Session, as leaving the
 * section did before sections stayed mounted: the page leaves the section's stack, and the
 * list shows its empty detail again when Sessions shows. A page swapped out within the shown
 * section is gone already. A compact window keeps New Session open.
 */
const closeWhenSectionHidden: PageListeners = ({ navigation }) => ({
  blur: (): void => {
    if (navigation.getParent()?.isFocused() === false)
      closeNewSession(navigation);
  },
});

// The listeners for a Session's page at this width.
export const useNewSessionListeners = (): PageListeners =>
  useSizeClass() === 'compact' ? noListeners : closeWhenSectionHidden;
