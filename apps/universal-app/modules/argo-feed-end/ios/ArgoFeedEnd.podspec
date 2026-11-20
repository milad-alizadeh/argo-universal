Pod::Spec.new do |s|
  s.name = 'ArgoFeedEnd'
  s.version = '1.0.0'
  s.summary = 'Keep the live Session Feed at its end as rows resize.'
  s.license = 'MIT'
  s.author = 'Argo'
  s.homepage = 'https://github.com/milad-alizadeh/argo-universal'
  s.platforms = { :ios => '18.0' }
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.swift_version = '5.9'
end
