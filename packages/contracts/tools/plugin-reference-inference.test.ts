import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from '../src/plugins/plugin-part-schemas';
import { resolvedReference } from './plugin-reference-inference';

describe('part accessibility reference', () => {
  it.each([
    {
      name: 'Link',
      accessibility: resolvedReference(pluginPartSchemas.Link).accessibility,
      keyboard: 'focus reaches the Link',
      voiceOver: 'exposes a link',
      talkBack: 'exposes a link',
    },
    {
      name: 'Dialog',
      accessibility: resolvedReference(pluginPartSchemas.Dialog).accessibility,
      keyboard: 'Focus remains within the Dialog',
      voiceOver: 'exposes a dialog',
      talkBack: 'exposes a dialog',
    },
    {
      name: 'Grid',
      accessibility: resolvedReference(pluginPartSchemas.Grid).accessibility,
      keyboard: 'static layout',
      voiceOver: 'no grid navigation semantics',
      talkBack: 'no grid navigation semantics',
    },
    {
      name: 'Markdown',
      accessibility: resolvedReference(pluginPartSchemas.Markdown)
        .accessibility,
      keyboard: 'adds no focus stop',
      voiceOver: 'exposes links as separate link controls',
      talkBack: 'exposes links as separate link controls',
    },
  ])(
    '$name describes its own keyboard and screen reader behavior',
    ({ accessibility, keyboard, voiceOver, talkBack }) => {
      expect(accessibility.keyboard).toContain(keyboard);
      expect(accessibility.voiceOver).toContain(voiceOver);
      expect(accessibility.talkBack).toContain(talkBack);
    },
  );
});
