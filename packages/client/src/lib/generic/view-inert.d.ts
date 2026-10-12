import 'react-native';

declare module 'react-native' {
  interface ViewProps {
    // React Native Web forwards the DOM's inert attribute: the subtree takes no focus or pointer input.
    inert?: boolean;
  }
}
