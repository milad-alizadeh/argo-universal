import { countConsumers } from './consumers.mjs';
import { readPackages } from './packages.mjs';
import { parseModule } from './parse.mjs';
import { createResolver } from './resolve.mjs';
import { isTestAsset, relative, walk } from './scan.mjs';

export function reportContext(root) {
  const packages = readPackages(root);
  const resolve = createResolver(packages);
  const modules = sourceModules(root, resolve);
  const production = [...modules.values()].filter(
    (module) => !isTestAsset(relative(root, module.file)),
  );
  return {
    root,
    packages,
    modules,
    production,
    counts: countConsumers(root, modules),
  };
}

export function modulesMatching(context, pattern) {
  return context.production
    .filter((module) => pattern.test(relative(context.root, module.file)))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function sourceModules(root, resolve) {
  return new Map(walk(root).map((file) => [file, parseModule(file, resolve)]));
}
