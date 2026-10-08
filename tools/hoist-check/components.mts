import { consumersOf } from './consumers.mts';
import {
  modulesMatching,
  type ReportContext,
  type ParsedModule,
} from './context.mts';
import { relative } from './scan.mts';

function consumerPlace(consumer: string): string {
  return consumer.startsWith('packages/client/src/components/')
    ? 'components/'
    : `${consumer.replace(/^packages\/client\/src\//, '').split('/')[0]}/`;
}

function addComponent(
  context: ReportContext,
  byPlace: Map<string, string[]>,
  module: ParsedModule,
): void {
  const [consumer] = consumersOf(context.counts, module.file).production;
  if (!consumer) return;
  const place = consumerPlace(consumer);
  const file = relative(context.root, module.file).replace(
    'packages/client/src/',
    '',
  );
  const entry = `${file} <- ${consumer.replace('packages/client/src/', '')}`;
  byPlace.set(place, [...(byPlace.get(place) ?? []), entry]);
}

function groupLines(place: string, entries: string[]): string[] {
  const header = `  consumer in ${place}: ${entries.length}`;
  return [
    header,
    ...(place === 'components/'
      ? []
      : entries
          .sort((a, b): number => a.localeCompare(b))
          .map((entry): string => `!   ${entry}`)),
  ];
}

function singleConsumerModules(
  context: ReportContext,
  modules: ParsedModule[],
): ParsedModule[] {
  return modules.filter(
    (module): boolean =>
      consumersOf(context.counts, module.file).production.size === 1,
  );
}

export function componentsReport(context: ReportContext): string[] {
  const modules = modulesMatching(
    context,
    /^packages\/client\/src\/components\//,
  );
  const single = singleConsumerModules(context, modules);
  return [
    '\n## C. Client components with one production consumer (informational)',
    `${single.length} of ${modules.length} component modules have one production consumer`,
    ...placeLines(componentPlaces(context, single)),
  ];
}

function componentPlaces(
  context: ReportContext,
  modules: ParsedModule[],
): Map<string, string[]> {
  const byPlace = new Map<string, string[]>();
  modules.map((module): void => addComponent(context, byPlace, module));
  return byPlace;
}

function placeLines(byPlace: Map<string, string[]>): string[] {
  return [...byPlace.entries()]
    .sort(([a], [b]): number => a.localeCompare(b))
    .flatMap(([place, entries]): string[] => groupLines(place, entries));
}
