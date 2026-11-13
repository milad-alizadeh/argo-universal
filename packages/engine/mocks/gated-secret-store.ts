import { MemorySecretStore } from './memory-secret-store';

// A SecretStore whose reads wait until the test answers them, to hold a Plugin call in flight.
export class GatedSecretStore extends MemorySecretStore {
  readonly waiting: ((value: string | null) => void)[] = [];

  override get(): Promise<string | null> {
    return new Promise((resolve) => this.waiting.push(resolve));
  }
}
