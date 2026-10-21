import { router, type Href } from 'expo-router';
import type { AnchorHTMLAttributes, MouseEvent, ReactElement } from 'react';
import { LinkPreview } from '#primitives/overlays/link-preview';
import type { LinkProps } from './link-props';
import { linkTarget, isRoute } from './link-target';

function modified(event: MouseEvent<HTMLAnchorElement>): boolean {
  return [
    event.metaKey,
    event.ctrlKey,
    event.shiftKey,
    event.altKey,
    event.button !== 0,
  ].some(Boolean);
}

function routePress(
  target: Href,
): (event: MouseEvent<HTMLAnchorElement>) => void {
  return (event) => {
    if (modified(event)) return;

    event.preventDefault();
    router.navigate(target);
  };
}

// Anchors preserve the surrounding type and the browser's copy, open-in-tab and focus behavior.
export function Link(props: LinkProps): ReactElement {
  const target = linkTarget(props);
  const label = props.children ?? props.label;

  if (!target) return <span>{label}</span>;

  return (
    <FollowedLink {...props} target={target}>
      {label}
    </FollowedLink>
  );
}

function anchorProps(
  props: LinkProps & { target: string },
): AnchorHTMLAttributes<HTMLAnchorElement> {
  const navigation = isRoute(props.route);

  const destination = navigation
    ? { title: props.target }
    : { target: '_blank', rel: 'noopener noreferrer' };

  return {
    href: props.target,
    onClick: isRoute(props.route) ? routePress(props.route) : undefined,
    ...destination,
  };
}

const anchorClass =
  'rounded-sm underline decoration-focus underline-offset-2 hover:decoration-foreground focus-visible:outline-3 focus-visible:outline-primary/35';

function FollowedLink(props: LinkProps & { target: string }): ReactElement {
  const anchor = <LinkAnchor {...props} />;

  return isRoute(props.route) ? (
    anchor
  ) : (
    <LinkPreview href={props.target}>{anchor}</LinkPreview>
  );
}

function LinkAnchor(props: LinkProps & { target: string }): ReactElement {
  return (
    <a
      {...anchorProps(props)}
      className={anchorClass}
      style={{ color: 'inherit', font: 'inherit' }}
    >
      {props.children}
    </a>
  );
}
