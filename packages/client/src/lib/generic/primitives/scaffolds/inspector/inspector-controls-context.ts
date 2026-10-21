import { createContext } from 'react';

// A window band may own the pane controls; standalone panes and sheets keep their own.
export const InspectorControlsContext = createContext(false);
