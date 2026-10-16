import * as React from 'react';

// Sibling popovers, such as the drills beside one menu: hovering one closes the others.
export const HoverGroup = React.createContext<Set<() => void> | undefined>(
  undefined,
);

export function PopoverHoverGroup({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const [members] = React.useState(() => new Set<() => void>());

  return <HoverGroup value={members}>{children}</HoverGroup>;
}

export function closeSiblings(
  group: Set<() => void> | undefined,
  current: () => void,
): void {
  group?.forEach((close) => {
    if (close !== current) close();
  });
}

export function register(
  group: Set<() => void> | undefined,
  close: () => void,
): () => void {
  group?.add(close);

  return () => {
    group?.delete(close);
  };
}
