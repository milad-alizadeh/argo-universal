import { type NativeStackNavigationOptions, Stack } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { useWide } from '#kit/use-wide/use-wide';
import { ScreenHeaderItems, screenTitleOptions } from './screen-header-items';
import { useScreenNavigator } from './screen-navigation-context';
import type { ScreenHeaderInput } from './screen-props';

export function ScreenNavigation(props: ScreenHeaderInput): ReactNode {
  if (!useScreenNavigator()) return null;

  return <StackHeader {...props} />;
}

function StackHeader(props: ScreenHeaderInput): ReactElement {
  const wide = useWide();

  const options = {
    ...titleOptions(props.title, wide),
    ...contentOptions(props),
  };

  return (
    <>
      <Stack.Screen options={options} />
      {nativeItems(props, wide)}
    </>
  );
}

function nativeItems(props: ScreenHeaderInput, wide: boolean): ReactNode {
  if (wide) return null;

  return narrowItems(props);
}

// A wide window draws the Screen's own heading, so the stack's header hides.
function titleOptions(
  title: string,
  wide: boolean,
): NativeStackNavigationOptions {
  return { ...screenTitleOptions, title, headerShown: !wide };
}

function contentOptions(
  props: ScreenHeaderInput,
): NativeStackNavigationOptions {
  const replacement = props.contentHeader?.replacement;

  return {
    header: replacement
      ? () => <View className="bg-content pt-safe">{replacement}</View>
      : undefined,
  };
}

function narrowItems(props: ScreenHeaderInput): ReactNode {
  return props.contentHeader?.replacement ? null : (
    <ScreenHeaderItems {...props} />
  );
}
