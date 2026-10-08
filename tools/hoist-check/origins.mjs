function reExportOrigin(edge, name, find) {
  if (!edge.target) return;
  return edge.names
    .map((entry) => namedOrigin({ target: edge.target, entry, name }, find))
    .find(Boolean);
}

function namedOrigin({ target, entry, name }, find) {
  if (entry.local === '*') return find(target, name);
  if (entry.local !== name) return;
  return importedOrigin(target, entry.imported, find);
}

function importedOrigin(target, name, find) {
  return name === '*'
    ? { file: target, name }
    : (find(target, name) ?? { file: target, name });
}

function exportOrigin(module, name, find) {
  if (!module) return;
  if (module.declared.has(name)) return { file: module.file, name };
  return module.reExports
    .map((edge) => reExportOrigin(edge, name, find))
    .find(Boolean);
}

export function createOriginFinder(modules) {
  return function originOf(file, name, seen = new Set()) {
    const key = `${file}#${name}`;
    if (seen.has(key)) return;
    seen.add(key);
    return exportOrigin(modules.get(file), name, (target, symbol) =>
      originOf(target, symbol, seen),
    );
  };
}

export function createExportNameFinder(modules) {
  return (file) => exportedNames(modules, file, new Set());
}

function exportedNames(modules, file, seen) {
  if (seen.has(file)) return [];
  seen.add(file);
  const module = modules.get(file);
  if (!module) return [];
  return exposedNames(module, (target) => exportedNames(modules, target, seen));
}

function reExportNames(edge, find) {
  if (!edge.target) return [];
  return edge.names.flatMap((entry) =>
    entry.local === '*' ? find(edge.target) : [entry.local],
  );
}

function exposedNames(module, find) {
  return [
    ...module.declared,
    ...module.reExports.flatMap((edge) => reExportNames(edge, find)),
  ];
}
