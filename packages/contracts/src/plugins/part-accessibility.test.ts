import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from './plugin-part-schemas';

describe('part accessibility reference', () => {
  it.each([
    {
      name: 'Link',
      accessibility: pluginPartSchemas.Link.reference.accessibility,
      keyboard: 'focus reaches the Link',
      voiceOver: 'exposes a link',
      talkBack: 'exposes a link',
    },
    {
      name: 'Dialog',
      accessibility: pluginPartSchemas.Dialog.reference.accessibility,
      keyboard: 'Focus remains within the Dialog',
      voiceOver: 'exposes a dialog',
      talkBack: 'exposes a dialog',
    },
    {
      name: 'Grid',
      accessibility: pluginPartSchemas.Grid.reference.accessibility,
      keyboard: 'static layout',
      voiceOver: 'no grid navigation semantics',
      talkBack: 'no grid navigation semantics',
    },
    {
      name: 'Markdown',
      accessibility: pluginPartSchemas.Markdown.reference.accessibility,
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
