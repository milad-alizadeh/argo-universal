import { ruleTester } from './rule-tester.ts';
import { styleTokens } from './style-tokens.ts';

const arbitraryValue = [{ messageId: 'arbitraryValue' }];

const rawColour = [{ messageId: 'rawColour' }];

const paletteColour = [{ messageId: 'paletteColour' }];

ruleTester.run('style-tokens', styleTokens, {
  valid: [
    '<View className="h-5.5 min-w-5.5 bg-tray shadow-tray" />;',
    "const list = 'w-full wide:w-frame-list wide:px-2';",
    'const glow = `color-mix(in oklab, ${colour} 40%, transparent)`;',
    "const issue = 'See [the link](https://example.com) and items[0]';",
    "const heading = '# Title';",
    "const reference = '[spec]: https://argo.dev/spec';",
    "type('#412 ');",
    "useCSSVariable('--color-glow-warm');",
    '<Text className="text-foreground dark:text-muted-foreground" />;',
    "const surface = 'bg-card border-border bg-selected text-danger/10';",
    "const plain = 'bg-transparent text-xs border-2 shadow-sm';",
    "const prose = 'The text is white and the background black.';",
  ],
  invalid: [
    {
      code: '<View className="w-[390px] max-w-full" />;',
      errors: arbitraryValue,
    },
    { code: "const badge = 'h-[22px] px-1.5';", errors: arbitraryValue },
    {
      code: "const ring = 'web:focus-visible:ring-[3px]';",
      errors: arbitraryValue,
    },
    {
      code: "const item = 'web:data-[disabled]:opacity-50';",
      errors: arbitraryValue,
    },
    { code: "const icon = 'web:[&_svg]:shrink-0';", errors: arbitraryValue },
    {
      code: '<View className="bg-[#e5e5e5b3] dark:bg-[#262626b3]" />;',
      errors: rawColour,
    },
    { code: "const glow = { warm: '#c4aa8c' };", errors: rawColour },
    { code: '<Switch color="#fff" />;', errors: rawColour },
    {
      code: "const shadow = '0 1px 2px rgb(0 0 0 / 0.05)';",
      errors: rawColour,
    },
    { code: 'const tint = `oklch(64% 0 0)`;', errors: rawColour },
    { code: '<Text className="text-white" />;', errors: paletteColour },
    { code: "const scrim = 'bg-black/50';", errors: paletteColour },
    {
      code: '<View className="bg-card dark:bg-neutral-900" />;',
      errors: paletteColour,
    },
    {
      code: "const edge = 'web:hover:border-red-500';",
      errors: paletteColour,
    },
    {
      code: "const shadow = 'shadow-sm shadow-black/5';",
      errors: paletteColour,
    },
    { code: "usePrimitiveColor('!text-neutral-100');", errors: paletteColour },
  ],
});
