type Listener = () => void;

/*
 * A Session attached to an Issue or detached from one, told to the pages that show a Session's Issue so they read its
 * link again. The Slots hear it through `argo.slots.changed`; a page has no such call, so it listens here.
 */
export type LinkChanges = {
  subscribe: (listener: Listener) => () => void;
  publish: () => void;
};

export function createLinkChanges(): LinkChanges {
  const listeners = new Set<Listener>();

  return {
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    publish: () => {
      for (const listener of listeners) listener();
    },
  };
}
