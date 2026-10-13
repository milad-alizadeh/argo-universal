import { useCallback, useState } from 'react';
import { terminalControl } from './terminal-input';
class TerminalControl {
  private pressed = false;
  public toggle(): boolean {
    this.pressed = !this.pressed;
    return this.pressed;
  }
  public apply(text: string): string {
    const result = this.pressed ? terminalControl(text) : text;
    this.pressed = false;
    return result;
  }
}
type ControlModifier = {
  control: boolean;
  toggleControl: () => void;
  apply: (text: string) => string;
};
export function useControlModifier(): ControlModifier {
  const [modifier] = useState(() => new TerminalControl());
  const [control, setControl] = useState(false);
  const apply = useCallback(
    (text: string): string => {
      const result = modifier.apply(text);
      setControl(false);
      return result;
    },
    [modifier],
  );
  return { control, toggleControl: () => setControl(modifier.toggle()), apply };
}
