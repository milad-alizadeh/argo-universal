import type { ReactElement, ReactNode } from 'react';
import { Linking, Platform, Text } from 'react-native';
import { LinkPreview } from './link-preview';

type Props = { href: string; children: ReactNode };

export function Link(props: Props): ReactElement {
  return (
    <LinkPreview href={props.href}>
      <StoryAnchor {...props} />
    </LinkPreview>
  );
}

function StoryAnchor({ href, children }: Props): ReactElement {
  return Platform.OS === 'web' ? (
    <a href={href} className="underline decoration-focus underline-offset-2">
      {children}
    </a>
  ) : (
    <Text role="link" onPress={() => void Linking.openURL(href)}>
      {children}
    </Text>
  );
}
