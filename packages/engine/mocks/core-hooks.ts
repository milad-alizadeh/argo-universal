import { HookPort } from '../src/plugins';

// Core's own answers to every Hook event, as when no Plugin hooks them.
export const coreOnlyHooks = new HookPort().hooks;
