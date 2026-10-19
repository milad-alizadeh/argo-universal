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
  Text: {
    summary:
      'Text content with an optional Argo typography role and semantic tone.',
    accessibility: {
      label:
        'Text children supply the content. Optional `accessibilityLabel` overrides the spoken label.',
      keyboard: 'Text is not focusable and adds no keyboard shortcut.',
      voiceOver:
        'Reads `accessibilityLabel` when set; otherwise reads the text children.',
      talkBack:
        'Reads `accessibilityLabel` when set; otherwise reads the text children.',
    },
    appearance:
      '`tone` selects an Argo semantic text color that adapts to light and dark appearance. This part has no arbitrary `color` or Image prop.',
    sdkProps:
      'Plugin JSX accepts text children; the worker serializes them as the `children` prop.',
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
  },
  Stack: layout(
    'A row or column layout with token spacing and cross-axis alignment.',
  ),
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
