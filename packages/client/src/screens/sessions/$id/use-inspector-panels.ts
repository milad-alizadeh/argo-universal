import {
  type SessionPanels,
  offeredPanels,
  useSessionPanels,
} from '#features/sessions';
import {
  offeredSessionPanels,
  type SessionInspectorContent,
} from './session-inspector';

export function useInspectorPanels(
  props: SessionInspectorContent & { inspectorPanels?: SessionPanels },
  includeCardSheets = true,
): SessionPanels {
  const offered = offeredSessionPanels(props, includeCardSheets);
  const panels = useSessionPanels(offered);
  const supplied = props.inspectorPanels;

  return supplied
    ? { ...supplied, state: offeredPanels(supplied.state, offered) }
    : panels;
}
