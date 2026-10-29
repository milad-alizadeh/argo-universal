/*
 * Session configuration: the whole life of a Session's choices for its Agent's options. It checks a choice
 * against what the Agent offers, queues it or holds it while a Turn runs, sends it to the Agent (the only
 * sender of `session/set_config_option`), reapplies durable choices after resume, and stores the options
 * on the Session and its Agent, which the Agent options read before Send offers.
 */

// The Session machine's invoked operations.
export {
  restoreConfiguration,
  sendQueuedChoice,
  type RestoredConfiguration,
} from './session-operations';

// The Session machine's actions and guard.
export {
  acknowledgeConfigChoice,
  queueConfigChoice,
  rejectPendingConfig,
  releaseHeldConfig,
  takeConfigChoice,
} from './queue';

export { holdConfigChoice } from './hold';

export { rejectConfigChoice, reportConfiguration } from './report';

export { currentModel, hasConfigurationCapacity } from './choices';

export { agentOptionsJob, slashCommandsJob } from './store';

// Session commands and readers.
export { applyInitialConfiguration, applySessionConfig } from './commands';

export { withHeldConfiguration } from './held';

export { agentOptionsUpdates } from './agent-options';
