import { MemoryKeychain } from './memory-keychain';

// A Keychain whose reads wait until the test answers them, to hold a Plugin call in flight.
export class GatedKeychain extends MemoryKeychain {
  readonly waiting: ((value: string | null) => void)[] = [];

  override get(): Promise<string | null> {
    return new Promise((resolve) => this.waiting.push(resolve));
  }
}
