import { router, type Href } from 'expo-router';
import {
  useContext,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactElement,
} from 'react';
import { cn } from '#kit/utils';
import {
  LinkPreview,
  LinkToneContext,
} from '#primitives/overlays/link-preview';
import { toneTextClass, type MarkTone } from '../../../tone-mark';
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

const anchorBase =
  'rounded-sm underline-offset-2 focus-visible:outline-3 focus-visible:outline-primary/35';

type AnchorLook = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'className' | 'style'
>;

// An unmarked link keeps the text's colour and a quiet underline.
const plainLook: AnchorLook = {
  className: cn(
    anchorBase,
    'underline decoration-focus hover:decoration-foreground',
  ),
  style: { color: 'inherit', font: 'inherit' },
};

// A marked link is drawn in its mark's tone and underlines only under the pointer, as ChangeStage draws a number.
const markedLook = (tone: MarkTone): AnchorLook => ({
  className: cn(
    anchorBase,
    'no-underline hover:underline',
    toneTextClass(tone),
  ),
  style: { font: 'inherit' },
});

const anchorLook = (tone: MarkTone | null): AnchorLook =>
  tone ? markedLook(tone) : plainLook;

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
    <a {...anchorProps(props)} {...anchorLook(useContext(LinkToneContext))}>
      {props.children}
    </a>
  );
}
