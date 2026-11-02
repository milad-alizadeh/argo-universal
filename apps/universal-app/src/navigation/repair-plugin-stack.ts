import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { useLayoutEffect } from 'react';
import { repairedPluginRoutes, type PageAt } from './plugin-stack-below';

type Navigation = NavigationProp<ParamListBase>;

function repair(navigation: Navigation, key: string, where: PageAt): void {
  const stack = navigation.getState();
  const routes = repairedPluginRoutes(stack, key, where);

  if (routes) {
    navigation.dispatch(
      CommonActions.reset({ ...stack, index: routes.length - 1, routes }),
    );
  }
}

// Each run is a check of the stack as it is, so it does nothing once the stack has been repaired, and the page's nav item is known once the list of Plugins says which that is.
export function useRepairPluginStack(
  path: readonly string[],
  root: readonly string[] | undefined,
  wide: boolean,
): void {
  const navigation = useNavigation<Navigation>();
  const { key } = useRoute();

  useLayoutEffect(() => {
    if (root) repair(navigation, key, { path, root, wide });
  }, [navigation, key, path, root, wide]);
}
