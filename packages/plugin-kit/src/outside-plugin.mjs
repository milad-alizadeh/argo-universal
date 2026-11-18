/*
 * Node finds `@argo/plugin-kit` here only outside a Plugin, as when a test file imports a module that draws or signs
 * in. The kit runs inside a Plugin alone, where Argo serves it, so this says what to do instead.
 */
throw new Error(
  '@argo/plugin-kit runs only inside a Plugin, so a test cannot import a module that uses its components, JSX or flows. Move what the test shares with the Plugin, such as keys and paths, into a module that imports nothing from @argo/plugin-kit, and reach the rest through the page the test opens.',
);
