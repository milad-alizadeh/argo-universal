import { useEffect, useRef, useState } from 'react';
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

const sameResources = (
  first: readonly SuggestionResource[],
  second: readonly SuggestionResource[],
): boolean =>
  first.length === second.length &&
  first.every((resource, index) => resource.uri === second[index]?.uri);

/*
 * Tells the host which resources the draft carries, whenever that list changes. Returns what the
 * drawing calls when a result is chosen. Both drawings use it, so the rule is written once.
 */
export function useChosenResources(
  text: string,
  onResourcesChange: OnResourcesChange | undefined,
): (suggestion: ComposerSuggestion) => void {
  const [chosen, setChosen] = useState<readonly ComposerSuggestion[]>([]);
  const reported = useRef<readonly SuggestionResource[]>([]);
  const report = useRef(onResourcesChange);
  report.current = onResourcesChange;

  useEffect(() => {
    const resources = resourcesInText(text, chosen);

    if (sameResources(resources, reported.current)) return;
    reported.current = resources;
    report.current?.(resources);
  }, [text, chosen]);

  return (suggestion) =>
    setChosen((previous) =>
      suggestion.resource ? [...previous, suggestion] : previous,
    );
}
