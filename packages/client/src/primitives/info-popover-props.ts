export interface InfoPopoverProps {
  // Names the "i" for assistive tech, such as "About effort".
  accessibilityLabel: string;
  text: string;
}

// The "i" box is 28 wide with the icon centred, so callers offset it to sit on a row's chevron edge.
export const infoPopoverTriggerClass = 'size-7 items-center justify-center';
