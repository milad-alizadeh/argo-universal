import type { ReactElement, ReactNode } from 'react';
import { isLinkUrl } from '#lib/generic/link-url';
import { LinkPreview } from '#primitives/overlays/link-preview';

type LinkProps = { href: string; children: ReactNode };

// A real anchor preserves browser navigation, copy-link and context menus.
export function Link(props: LinkProps): ReactElement {
  if (!isLinkUrl(props.href)) return <span>{props.children}</span>;

  return (
    <LinkPreview href={props.href}>
      <FollowedLink {...props} />
    </LinkPreview>
  );
}

function FollowedLink({ href, children }: LinkProps): ReactElement {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-inherit underline decoration-focus underline-offset-2 hover:decoration-current focus-visible:outline-3 focus-visible:outline-primary/35 rounded-sm"
    >
      {children}
    </a>
  );
}
