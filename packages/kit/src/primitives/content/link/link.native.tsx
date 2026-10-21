import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Linking, Text } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import type { LinkProps } from './link-props';
import { linkTarget, isRoute } from './link-target';

export function Link(props: LinkProps): ReactElement {
  const target = linkTarget(props);
  const label = props.children ?? props.label;

  if (!target) return <Text>{label}</Text>;

  return (
    <FollowedLink {...props} target={target}>
      {label}
    </FollowedLink>
  );
}

function follow(props: LinkProps & { target: string }): void {
  if (isRoute(props.route)) router.navigate(props.route);
  else void Linking.openURL(props.target);
}

function FollowedLink(props: LinkProps & { target: string }): ReactElement {
  const behavior = {
    role: 'link' as const,
    onPress: (): void => follow(props),
    style: { textDecorationColor: useResolveClassNames('text-focus').color },
  };

  return (
    <Text
      {...behavior}
      className="underline underline-offset-2 ios:active:opacity-50 android:active:bg-pressed"
    >
      {props.children}
    </Text>
  );
}
