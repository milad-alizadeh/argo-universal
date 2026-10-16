/*
 * One portal on every platform (@gorhom/portal, pure React Native): the app root's PortalProvider holds the
 * default host, and a PortalHost with its own name holds a region's content, as the plan proposal does.
 * Content drawn through a Portal reads context where its host sits, so a part that needs its owner's
 * context provides it again inside the Portal.
 */
export { Portal, PortalHost, PortalProvider } from '@gorhom/portal';
