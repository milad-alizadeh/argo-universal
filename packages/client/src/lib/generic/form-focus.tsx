import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
} from 'react';

type Field = { focus: () => Promise<void> };

type Fields = Set<RefObject<Field | null>>;

const FormFocus = createContext<Fields | undefined>(undefined);

// Compose fields live in separate Hosts; their focus handles cross that native boundary.
export function FormFocusScope({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [fields] = useState<Fields>(() => new Set());

  return <FormFocus value={fields}>{children}</FormFocus>;
}

type FieldFocus<T extends Field> = {
  ref: RefObject<T | null>;
  next: () => void;
};

export function useFormFocus<T extends Field>(
  disabled?: boolean,
): FieldFocus<T> {
  const fields = useContext(FormFocus);
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (disabled) return;
    fields?.add(ref);

    return (): void => {
      fields?.delete(ref);
    };
  }, [fields, disabled]);

  return { ref, next: () => nextField(fields ?? new Set(), ref) };
}

function nextField(fields: Fields, current: RefObject<Field | null>): void {
  const entries = [...fields];
  const next = entries[entries.indexOf(current) + 1];

  const field = next?.current;

  if (field) void field.focus();
}
