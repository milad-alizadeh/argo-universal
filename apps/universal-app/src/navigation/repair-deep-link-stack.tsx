import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { useLayoutEffect } from 'react';
import { repairedCoreRoutes } from './core-stack-below';

/*
 * A page opened by its address has the root below it so Back has somewhere to go. Opened cold, the router gives the
 * root the page's params (`name`, `id`), which the root has no param for, so its address would show a query string.
 * Delivered to a running App, the page is pushed over the section's root, with no params. Either way the page's own
 * list (Projects between Settings and a Project) is skipped. The stack is reset without the params and with the list
 * in between, once, as the page opens. It is placed in the page's own layout, not in the root: the root below a page
 * mounts later, and a reset made then, from the stack as it was, put back a page that a quick Back had just left.
 */
export function RepairDeepLinkStack(): null {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { key } = useRoute();

  useLayoutEffect(() => {
    const stack = navigation.getState();
    const routes = repairedCoreRoutes(stack, key);

    if (!routes) return;

    navigation.dispatch(
      CommonActions.reset({ ...stack, index: routes.length - 1, routes }),
    );
  }, [navigation, key]);

  return null;
}
