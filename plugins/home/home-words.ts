// What the Home pages say, shared with the tests; this module imports nothing from the kit.
export const homeWords = {
  title: 'Home',
  service: 'Philips Hue',
  connect: 'Connect your Hue Bridge',
  connectDescription:
    'Argo presses your Bridge’s link button through Hue’s cloud and keeps the key it gives.',
  connectButton: 'Connect Bridge',
  noLights: 'No lights yet',
  noLightsDescription: 'Add lights in the Hue app and they show here.',
  failed: 'Couldn’t reach your Hue Bridge',
  retry: 'Try again',
  otherLights: 'Other lights',
  allLights: 'All lights',
  power: 'On',
  brightness: 'Brightness',
} as const;

// A room's card says how many lights it holds.
export const roomSubtitle = (count: number): string =>
  count === 1 ? '1 light' : `${count} lights`;
