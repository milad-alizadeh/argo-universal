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

// A marked link's label is drawn in its mark's tone, and underlines only under the pointer, as ChangeStage's number.
const markedClass = (tone: MarkTone): string =>
  cn(
    'rounded-sm no-underline underline-offset-2 hover:underline focus-visible:outline-3 focus-visible:outline-primary/35',
    toneTextClass(tone),
  );

function LinkAnchor(props: LinkProps & { target: string }): ReactElement {
  const tone = useContext(LinkToneContext);

  return (
    <a
      {...anchorProps(props)}
      className={tone ? markedClass(tone) : anchorClass}
      style={tone ? { font: 'inherit' } : { color: 'inherit', font: 'inherit' }}
    >
      {props.children}
    </a>
  );
}
