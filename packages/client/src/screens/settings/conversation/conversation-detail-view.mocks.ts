import { fn, type within } from 'storybook/test';
import type { VoiceDetailViewActions } from './conversation-detail-view-props';

type Canvas = ReturnType<typeof within>;

const follows = (
  earlier: HTMLElement | undefined,
  later: HTMLElement,
): boolean =>
  earlier !== undefined &&
  Boolean(
    earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING,
  );

// Whether each text is drawn once and after the one before it, so rows read in their groups' order.
export function inReadingOrder(canvas: Canvas, texts: string[]): boolean {
  const drawn = texts.map((text) => canvas.getByText(text));

  return drawn.slice(1).every((row, at) => follows(drawn[at], row));
}

// A spy for every action the Voice page takes, for its test stories.
export const voiceDetailSpies = (): VoiceDetailViewActions => ({
  onEnabledChange: fn(),
  onProviderChange: fn(),
  onVoiceChange: fn(),
  onPreviewVoice: fn(),
  onInstructionsChange: fn(),
  onCallOptionsChange: fn(),
  onEditorChange: fn(),
  onSaveCustomVoice: fn(),
  onDeleteCustomVoice: fn(),
  onPreviewCustomVoice: fn(),
  onDevicesChange: fn(),
  onRetry: fn(),
});
