Pod::Spec.new do |s|
  s.name           = 'ArgoChannel'
  s.version        = '1.0.0'
  s.summary        = 'Argo channel: the encrypted channel to a paired Server, carried natively'
  s.description    = 'Owns the channel WebSocket on iOS: decrypts each record with CryptoKit and hands JavaScript one finished message string at a time.'
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
