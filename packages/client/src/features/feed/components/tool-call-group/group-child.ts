import { createContext } from 'react';

// A group's children identify the command, running or settled; their parent already summarizes the work.
export const GroupChild = createContext(false);
