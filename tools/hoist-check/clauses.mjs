function namedBindings(clause) {
  const start = clause.indexOf('{');
  if (start < 0) return [];
  const names = clause.slice(start + 1, clause.indexOf('}'));
  return names.join(' ').split(',').flatMap(namedBinding);
}

function namedBinding(binding) {
  const words = bindingWords(binding);
  if (!words[0]) return [];
  const [imported, separator, renamed] = words;
  return [{ imported, local: separator === 'as' ? renamed : imported }];
}

function namespaceBinding(clause) {
  const position = clause.indexOf('*');
  if (position < 0) return [];
  return [{ imported: '*', local: clause[position + 2] ?? '*' }];
}

function defaultBinding(clause) {
  const name = defaultName(clause);
  return /^[\w$]+$/.test(name) ? [{ imported: 'default', local: name }] : [];
}

export function parseClause(clause) {
  return [
    ...defaultBinding(clause),
    ...namespaceBinding(clause),
    ...namedBindings(clause),
  ];
}

export function declarationNames(clause) {
  const declaration = clause.filter(
    (token) => !['declare', 'async', 'abstract'].includes(token),
  );
  if (declaration[0] === 'default') return ['default'];
  if (declaration[0] === '{')
    return namedBindings(declaration).map((entry) => entry.local);
  return declarationBinding(declaration);
}

function declarationBinding(declaration) {
  if (declaration[0] === '*') return [];
  return [declaration[1] === '*' ? declaration[2] : declaration[1]].filter(
    Boolean,
  );
}

function bindingWords(binding) {
  const words = binding.trim().split(/\s+/);
  if (words[0] === 'type') words.shift();
  return words;
}

function defaultName(clause) {
  return (clause[0] === 'type' ? clause[1] : clause[0]) ?? '';
}
