/*
 * Prism types only its browser entry, which highlights the page by itself on load. Argo takes the
 * DOM-free core instead: the same surface, minus that.
 */
declare module 'prismjs/components/prism-core.js' {
  import Prism from 'prismjs';

  export default Prism;
}

/*
 * A grammar script has no exports of its own: it registers itself on the core above and is imported
 * for that alone. The exact declaration wins over this one, so the core keeps its typing.
 */
declare module 'prismjs/components/*';
