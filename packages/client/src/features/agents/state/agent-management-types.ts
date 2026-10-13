export interface AgentManagement {
  enabled: boolean;
  busy: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onRemove: () => void;
  failure?: string;
  onDismissFailure: () => void;
}
