import { describe, expect, it } from 'vitest';
import { readTypedAddress } from './typed-address';

describe('readTypedAddress', () => {
  it('reads host:port and an http link that carries a port', () => {
    const at = { host: 'studio.tailnet.ts.net', port: 4000 };

    expect(readTypedAddress('studio.tailnet.ts.net:4000')).toEqual(at);
    expect(readTypedAddress(' http://studio.tailnet.ts.net:4000 ')).toEqual(at);
  });

  it('knocks nowhere on a name with no port', () => {
    expect(readTypedAddress('studio.tailnet.ts.net')).toBeUndefined();
    expect(readTypedAddress(undefined)).toBeUndefined();
  });
});
