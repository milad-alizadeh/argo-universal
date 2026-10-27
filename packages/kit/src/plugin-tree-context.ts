import { createContext, useContext } from 'react';

// Set by the App around a Plugin's tree, so its Actions cannot claim Argo's reserved shortcuts.
export const PluginTreeContext = createContext(false);

export const usePluginTree = (): boolean => useContext(PluginTreeContext);
