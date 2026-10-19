import type * as React from 'react';

export { jsx, jsxs, Fragment } from 'react/jsx-runtime';

// Keep React's component checking while admitting only the kit's declared components.
export namespace JSX {
  type ElementType = React.JSX.ElementType;

  type Element = React.JSX.Element;

  type ElementClass = React.JSX.ElementClass;

  type ElementAttributesProperty = React.JSX.ElementAttributesProperty;

  type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;

  type LibraryManagedAttributes<Component, Props> =
    React.JSX.LibraryManagedAttributes<Component, Props>;

  type IntrinsicAttributes = React.JSX.IntrinsicAttributes;

  type IntrinsicClassAttributes<Instance> =
    React.JSX.IntrinsicClassAttributes<Instance>;

  type IntrinsicElements = Record<never, never>;
}
