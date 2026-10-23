import { createContext } from 'react';

/*
 * True inside a FieldGroup's native tree, which never holds React Native content. A Host inside another one's
 * native content is placed by SwiftUI or Compose where React Native can't see it, so a kit Host there (a Button
 * in a section) draws its children straight into the FieldGroup's tree.
 */
export const InsideHostContext = createContext(false);
