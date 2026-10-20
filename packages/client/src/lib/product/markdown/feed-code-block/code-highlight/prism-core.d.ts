/*
 * Prism types only its browser entry, which highlights the page by itself on load. Argo takes the
 * DOM-free core instead: the same surface, minus that. A grammar script has no exports of its own —
 * it registers itself on the core and is imported for that alone.
 */
declare module 'prismjs/components/prism-core.js' {
  const Prism: typeof import('prismjs');

  export default Prism;
}

declare module 'prismjs/components/prism-bash.js';
declare module 'prismjs/components/prism-clike.js';
declare module 'prismjs/components/prism-css.js';
declare module 'prismjs/components/prism-go.js';
declare module 'prismjs/components/prism-javascript.js';
declare module 'prismjs/components/prism-json.js';
declare module 'prismjs/components/prism-jsx.js';
declare module 'prismjs/components/prism-markdown.js';
declare module 'prismjs/components/prism-markup.js';
declare module 'prismjs/components/prism-python.js';
declare module 'prismjs/components/prism-rust.js';
declare module 'prismjs/components/prism-sql.js';
declare module 'prismjs/components/prism-tsx.js';
declare module 'prismjs/components/prism-typescript.js';
declare module 'prismjs/components/prism-yaml.js';
