import { consumersOf } from './consumers.mjs';
import { modulesMatching } from './context.mjs';
import { relative } from './scan.mjs';

function consumerPlace(consumer) {
  return consumer.startsWith('packages/client/src/components/')
    ? 'components/'
    : `${consumer.replace(/^packages\/client\/src\//, '').split('/')[0]}/`;
}

function addComponent(context, byPlace, module) {
  const [consumer] = consumersOf(context.counts, module.file).production;
  const place = consumerPlace(consumer);
  const file = relative(context.root, module.file).replace(
    'packages/client/src/',
    '',
  );
  const entry = `${file} <- ${consumer.replace('packages/client/src/', '')}`;
  byPlace.set(place, [...(byPlace.get(place) ?? []), entry]);
}

function groupLines(place, entries) {
  const header = `  consumer in ${place}: ${entries.length}`;
  return [
    header,
    ...(place === 'components/'
      ? []
      : entries
          .sort((a, b) => a.localeCompare(b))
          .map((entry) => `!   ${entry}`)),
  ];
}

export function componentsReport(context) {
  const modules = modulesMatching(
    context,
    /^packages\/client\/src\/components\//,
  );
  const single = modules.filter(
    (module) => consumersOf(context.counts, module.file).production.size === 1,
  );
  const byPlace = componentPlaces(context, single);
  return [
    '\n## C. Client components with one production consumer (informational)',
    `${single.length} of ${modules.length} component modules have one production consumer`,
    ...placeLines(byPlace),
  ];
}

function componentPlaces(context, modules) {
  const byPlace = new Map();
  modules.map((module) => addComponent(context, byPlace, module));
  return byPlace;
}

function placeLines(byPlace) {
  return [...byPlace.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([place, entries]) => groupLines(place, entries));
}
