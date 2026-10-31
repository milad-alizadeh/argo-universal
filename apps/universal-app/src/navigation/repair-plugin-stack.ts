import { useNavigation, useRoute } from 'expo-router';
import {
  CommonActions,
  type NavigationProp,
  type ParamListBase,
} from 'expo-router/react-navigation';
import { useLayoutEffect } from 'react';
import { repairedPluginRoutes } from './plugin-stack-below';

interface PageAt {
  path: readonly string[];
  root: readonly string[];
}

type Navigation = NavigationProp<ParamListBase>;

function putRootBelow(
  navigation: Navigation,
  key: string,
  where: PageAt,
): void {
  const stack = navigation.getState();
  const routes = repairedPluginRoutes(stack, key, where);

  if (routes) {
    navigation.dispatch(
      CommonActions.reset({ ...stack, index: routes.length - 1, routes }),
    );
  }
}

// Opened by its address, a Plugin row page gets its nav item's list below it, once the list of Plugins says which that is. Each run is a check of the stack as it is, so it does nothing once the stack has been repaired.
export function useRepairPluginStack(
  path: readonly string[],
  root: readonly string[] | undefined,
): void {
  const navigation = useNavigation<Navigation>();
  const { key } = useRoute();

  useLayoutEffect(() => {
    if (root) putRootBelow(navigation, key, { path, root });
  }, [navigation, key, path, root]);
}
