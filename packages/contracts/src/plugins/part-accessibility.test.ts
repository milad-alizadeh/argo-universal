import { describe, expect, it } from 'vitest';
import { pluginPartSchemas } from './plugin-part-schemas';
import { wireParts } from './wire-parts';

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

describe('wire part reference schemas', () => {
  it('uses live schemas for Button, Stack, and Table', () => {
    expect(pluginPartSchemas.Button).toBe(wireParts.Button);
    expect(pluginPartSchemas.Stack).toBe(wireParts.Stack);
    expect(pluginPartSchemas.Table).toBe(wireParts.Table);
  });

  it('keeps Table child and Slot docs aligned with its live wire schema', () => {
    expect(pluginPartSchemas.Table.children).toBe(true);
    expect(pluginPartSchemas.Table.slots).toEqual({});
  });
});
