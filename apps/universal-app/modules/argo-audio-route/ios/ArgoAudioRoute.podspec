Pod::Spec.new do |s|
  s.name           = 'ArgoAudioRoute'
  s.version        = '1.0.0'
  s.summary        = 'SPIKE: puts a Conversation on the loudspeaker and names the audio route'
  s.description    = 'Spike only (latency on a phone). Moves a call from the earpiece to the loudspeaker and reports where its sound plays.'
  s.license        = 'MIT'
  s.author         = 'Argo'
  s.homepage       = 'https://github.com/milad-alizadeh/argo-universal'
  s.platforms      = { :ios => '18.0' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.swift_version = '5.9'
end
