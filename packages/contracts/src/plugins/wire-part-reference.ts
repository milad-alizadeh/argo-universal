export interface WirePartReference {
  summary: string;
  accessibility: {
    label: string;
    keyboard: string;
    voiceOver: string;
    talkBack: string;
  };
  appearance: string;
  sdkProps?: string;
  deprecated?: string;
}

function listAccessibility(): WirePartReference['accessibility'] {
  return {
    label:
      'The part adds no label. Give each interactive child its own accessible name.',
    keyboard:
      'The container adds no focus stop or keyboard shortcut. Keyboard behavior comes from its rendered children.',
    voiceOver:
      'The container adds no accessibility element; VoiceOver traverses the rendered children in order.',
    talkBack:
      'The container adds no accessibility element; TalkBack traverses the rendered children in order.',
  };
}

const listContainer = (summary: string): WirePartReference => ({
  summary,
  accessibility: listAccessibility(),
  appearance:
    'The container draws no color or image. Child parts use their own semantic tokens and appearance rules.',
  sdkProps:
    '`items` and `renderItem` are Plugin SDK props. The worker expands them into keyed children; neither prop crosses the wire.',
});

const layout = (summary: string): WirePartReference => ({
  summary,
  accessibility: {
    label:
      'The layout adds no label; child parts provide their own accessible names.',
    keyboard: 'The layout is not focusable and adds no keyboard shortcut.',
    voiceOver:
      'Adds no accessibility element; VoiceOver traverses descendants in source order.',
    talkBack:
      'Adds no accessibility element; TalkBack traverses descendants in source order.',
  },
  appearance:
    'Layout uses spacing tokens only; it does not set color or draw Image content.',
});

export const wirePartReferences = {
  GroupedListItem: {
    summary:
      'A grouped settings-style row with optional secondary value and named Slots.',
    accessibility: {
      label:
        'The required `label` is the spoken name. The optional `value` is secondary text.',
      keyboard:
        'When `onPress` is set, the row exposes link semantics and Enter activates it on web. Disabled rows cannot activate.',
      voiceOver:
        'A row with `onPress` exposes link semantics. It reads the label and optional value and reports disabled state.',
      talkBack:
        'A row with `onPress` exposes link semantics. It reads the label and optional value and reports disabled state.',
    },
    appearance:
      'The legacy row uses Argo semantic surfaces and text tokens, which adapt to the active color scheme. Use ListItem for Argo-drawn status and count badges.',
    deprecated:
      'Use `ListItem`; this legacy name remains accepted while first-party Plugins migrate.',
  },
  Pill: {
    summary: 'Static short text with a semantic tone or tracker color.',
    accessibility: {
      label: 'The required `text` is the spoken name.',
      keyboard: 'Pill is not focusable and adds no keyboard shortcut.',
      voiceOver: 'Reads the required `text`.',
      talkBack: 'Reads the required `text`.',
    },
    appearance:
      '`tone` uses semantic colors that adapt to light and dark appearance. `color` is for tracker labels and is preserved as supplied.',
  },
  VirtualList: {
    ...listContainer(
      'A list container whose item renderer runs in the Plugin worker and expands to keyed child nodes.',
    ),
    deprecated:
      'Use `List`; this legacy name remains accepted while first-party Plugins migrate.',
  },
  Table: listContainer(
    'A list-style data container whose item renderer runs in the Plugin worker and expands to keyed child nodes.',
  ),
  GroupedList: {
    ...listContainer(
      'A grouped list container whose item renderer runs in the Plugin worker and expands to keyed child nodes.',
    ),
    deprecated:
      'Legacy list vocabulary. Prefer `List`; this name remains accepted for compatibility.',
  },
  Text: {
    summary:
      'Text content with an optional Argo typography role and semantic tone.',
    accessibility: {
      label:
        'The required `label` is the content. Optional `accessibilityLabel` overrides the spoken label.',
      keyboard: 'Text is not focusable and adds no keyboard shortcut.',
      voiceOver:
        'Reads `accessibilityLabel` when set; otherwise reads `label`.',
      talkBack: 'Reads `accessibilityLabel` when set; otherwise reads `label`.',
    },
    appearance:
      '`tone` selects an Argo semantic text color that adapts to light and dark appearance. This part has no arbitrary `color` or Image prop.',
    sdkProps:
      'Plugin JSX also accepts text-only children in place of `label`; the worker normalizes them to the wire `label` prop.',
  },
  Button: {
    summary:
      'An actionable control with Argo variants, sizes, and an optional activation handler.',
    accessibility: {
      label: 'The required `label` is also the accessible name.',
      keyboard:
        'Follows the platform button focus order. On web, Enter and Space activate the focused button.',
      voiceOver:
        'Exposes a button, reads its label, and reports the disabled state.',
      talkBack:
        'Exposes a button, reads its label, and reports the disabled state.',
    },
    appearance:
      '`variant` and `tone` select Argo treatments that adapt to light and dark appearance. This part has no arbitrary `color` or Image prop.',
    sdkProps:
      'Plugin JSX also accepts text-only children in place of `label`; the worker normalizes them to the wire `label` prop.',
  },
  Stack: layout(
    'A row or column layout with token spacing and cross-axis alignment.',
  ),
  Row: {
    ...layout('A horizontal layout alias for `Stack`.'),
    deprecated: 'Use `Stack` with `direction="row"`.',
  },
  Column: {
    ...layout('A vertical layout alias for `Stack`.'),
    deprecated: 'Use `Stack` with `direction="column"`.',
  },
  Svg: {
    summary: 'Sanitized SVG artwork. Use Canvas for interactive drawing.',
    accessibility: {
      label: 'Accessible name for the image or button.',
      keyboard:
        'Not focusable as an image; `onPress` enables button activation.',
      voiceOver: 'Reads the label as an image or button, based on `onPress`.',
      talkBack: 'Reads the label as an image or button, based on `onPress`.',
    },
    appearance:
      '`tone` sets semantic color; Server sanitizes markup and rejects unsupported SVG.',
  },
} satisfies Record<string, WirePartReference>;
