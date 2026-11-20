// Photos, video and audio: picking an image, the Audio transport's filled play and pause, speaker on and off, and a video that cannot load.
export const mediaSymbols = {
  camera: { sf: 'camera', material: 'photo_camera' },
  'image-broken': {
    sf: 'photo.badge.exclamationmark',
    material: 'broken_image',
  },
  pause: { sf: 'pause.fill', material: 'pause' },
  photos: { sf: 'photo.on.rectangle', material: 'photo_library' },
  play: { sf: 'play.fill', material: 'play_arrow' },
  speaker: { sf: 'speaker.wave.2', material: 'volume_up' },
  'speaker-off': { sf: 'speaker.slash', material: 'volume_off' },
} as const;
