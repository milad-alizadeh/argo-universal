import { useCallback, useEffect, useState } from 'react';
import type {
  ComposerSuggestion,
  SuggestionResource,
} from './rich-textarea-suggestions';

type OnResourcesChange = (resources: readonly SuggestionResource[]) => void;

/*
 * The resources of the chosen results whose text is still in the draft, each once. Deleting the
 * inserted text drops its resource, so a prompt never carries a link for something no longer written.
 */
export function resourcesInText(
  text: string,
  chosen: readonly ComposerSuggestion[],
): SuggestionResource[] {
  const resources = chosen.flatMap(({ insert, resource }) =>
    resource && text.includes(insert.trim()) ? [resource] : [],
  );

  return resources.filter(
    (resource, index) =>
      resources.findIndex(({ uri }) => uri === resource.uri) === index,
  );
}

/*
 * Tells the host the resources the draft carries, each time the text changes once a result was
 * chosen. The host may have written a draft made before an earlier report landed, so the list is
 * told again rather than only when it differs; the host takes a list it already holds as no change.
 */
function useReportedResources(
  text: string,
  chosen: readonly ComposerSuggestion[],
  onResourcesChange: OnResourcesChange | undefined,
): void {
  useEffect(() => {
    if (chosen.length > 0) onResourcesChange?.(resourcesInText(text, chosen));
  }, [text, chosen, onResourcesChange]);
}

/*
 * Returns what a drawing calls when a result is chosen, and tells the host which resources the
 * draft carries. Both drawings use it, so the rule is written once.
 */
export function useChosenResources(
  text: string,
  onResourcesChange: OnResourcesChange | undefined,
): (suggestion: ComposerSuggestion) => void {
  const [chosen, setChosen] = useState<readonly ComposerSuggestion[]>([]);
  useReportedResources(text, chosen, onResourcesChange);

  return useCallback(
    (suggestion) => setChosen((previous) => [...previous, suggestion]),
    [],
  );
}
