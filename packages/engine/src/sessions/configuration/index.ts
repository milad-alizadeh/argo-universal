/*
 * Session configuration: the whole life of a Session's choices for its Agent's options. It checks a choice
 * against what the Agent offers, queues it or holds it while a Turn runs, sends it to the Agent (the only
 * sender of `session/set_config_option`), reapplies durable choices after resume, and stores the options
 * on the Session and its Agent, which the Agent options read before Send offers.
 */

// What the Session machine does with its choices.
export { sessionConfiguration } from './session-steps';

export type { ConfigurationStep } from './values';

// Session commands; a choice the Agent did not offer refuses them as a bad request.
export { applyInitialConfiguration, applySessionConfig } from './commands';

// Readers.
export { currentModel } from './option-values';

export { withHeldConfiguration } from './held-options';

export { agentOptionsUpdates } from './agent-options';
