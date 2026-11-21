import { wrappingComponent } from '@repo/kit/wrapped-component';
import {
  createElement,
  useContext,
  useLayoutEffect,
  useRef,
  type ElementType,
} from 'react';
import type * as React from 'react';
import { View } from 'react-native';
import {
  boxOf,
  DraftCommentingContext,
  DraftPlaceContext,
  type NodeIdentity,
} from './draft-commenting';
import type { PluginProps } from './plugin-rendering';

// The prop a node passes its wrapper; the wrapper takes it, so the kit component never sees it.
export const identityProp = 'draftNodeIdentity';

type Wrapped = PluginProps & { [identityProp]?: NodeIdentity };

const wrappers = new WeakMap<object, ElementType>();

/*
 * The kit component drawn for a node while a Draft is open for comments: the same component inside a view the App
 * can find on screen and mark. Parents read it as the component it wraps, as they read a Fragment's children.
 */
export function commentable(component: ElementType): ElementType {
  if (typeof component === 'string') return component;

  const known = wrappers.get(component);

  if (known) return known;

  function Commentable({
    [identityProp]: identity,
    ...props
  }: Wrapped): React.JSX.Element {
    const drawn = createElement(component, props);

    return identity ? (
      <CommentTarget identity={identity}>{drawn}</CommentTarget>
    ) : (
      drawn
    );
  }

  const wrapper = wrappingComponent(Commentable, component);

  wrappers.set(component, wrapper);

  return wrapper;
}

function CommentTarget({
  identity,
  children,
}: {
  identity: NodeIdentity;
  children: React.ReactNode;
}): React.JSX.Element {
  const commenting = useContext(DraftCommentingContext);
  const place = useContext(DraftPlaceContext);
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  const { address, nodeKey } = identity;

  useLayoutEffect(
    () =>
      commenting?.register({
        address,
        nodeKey,
        place,
        measure: (done) =>
          ref.current
            ? ref.current.measureInWindow((...rect) => done(boxOf(rect)))
            : done({ x: 0, y: 0, width: -1, height: -1 }),
      }),
    [commenting, address, nodeKey, place],
  );

  return (
    <View ref={ref} className="relative min-w-0 shrink">
      {children}
      {commenting && <commenting.Mark address={address} />}
    </View>
  );
}
