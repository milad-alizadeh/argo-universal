/*
 * The person's edits reach the form and come back as its value, sometimes late or
 * batched. Such an echo is text the native field has already shown, so writing it
 * back would undo newer typing; any other value came from outside, such as a reset.
 */
interface EditEchoes {
  edited: (text: string) => void;
  isEcho: (value: string) => boolean;
}

export function editEchoes(): EditEchoes {
  const pending: string[] = [];

  return {
    edited: (text) => {
      pending.push(text);
    },
    isEcho: (value) => takeEcho(pending, value),
  };
}

// Drops the edits up to this value: React commits them in order, so none can still return.
function takeEcho(pending: string[], value: string): boolean {
  const index = pending.lastIndexOf(value);
  pending.splice(0, index < 0 ? pending.length : index + 1);

  return index >= 0;
}
