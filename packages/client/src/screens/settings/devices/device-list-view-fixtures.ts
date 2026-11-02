import type { DeviceRow } from './device-rows';

const thisComputer: DeviceRow = {
  id: 'server-device',
  name: 'Milad’s Studio',
  platform: 'macos',
  serverDevice: true,
  seen: 'Active now',
};

// This computer first, marked and with no remove action, then each Paired Device.
export const threeDevices: readonly DeviceRow[] = [
  thisComputer,
  {
    id: 'phone',
    name: 'iPhone 15 Pro',
    platform: 'ios',
    serverDevice: false,
    seen: 'Active now',
  },
  {
    id: 'pixel',
    name: 'Pixel 9',
    platform: 'android',
    serverDevice: false,
    seen: 'Last seen yesterday',
  },
  {
    id: 'laptop',
    name: 'Work laptop',
    platform: 'windows',
    serverDevice: false,
    seen: 'Last seen 12 Oct',
  },
];

export const onlyThisComputer: readonly DeviceRow[] = [thisComputer];
