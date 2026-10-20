import { type SessionPanels, useSessionPanels } from '#features/sessions';
import {
  offeredSessionPanels,
  type SessionInspectorContent,
} from './session-inspector';

export function useInspectorPanels(
  props: SessionInspectorContent & { inspectorPanels?: SessionPanels },
): SessionPanels {
  const panels = useSessionPanels(offeredSessionPanels(props));

  return props.inspectorPanels ?? panels;
}
