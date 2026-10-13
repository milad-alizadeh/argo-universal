import type * as React from 'react';
import type { ReactNode } from 'react';
import { Linking, Text as Span } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { isLinkUrl } from '#lib/generic/link-url';
import { markdownLinkClassNames } from '#lib/generic/markdown-marks';

interface LinkProps {
  href: string;
  children: ReactNode;
}

// Only a link resolves its underline colour, so plain text never pays for the style lookup.
function FollowedLink({ href, children }: LinkProps): React.JSX.Element {
  const { color: underline } = useResolveClassNames(
    markdownLinkClassNames.viewColor,
  );
  return (
    <Span
      role="link"
      className={markdownLinkClassNames.underline}
      style={{ textDecorationColor: underline }}
      onPress={() => void Linking.openURL(href)}
    >
      {children}
    </Span>
  );
}

// A link Argo does not follow (only http, https and mailto) keeps its text and opens nothing.
export function Link({ href, children }: LinkProps): React.JSX.Element {
  return isLinkUrl(href) ? (
    <FollowedLink href={href}>{children}</FollowedLink>
  ) : (
    <Span>{children}</Span>
  );
}
