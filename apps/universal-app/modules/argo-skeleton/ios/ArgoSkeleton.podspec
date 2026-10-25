Pod::Spec.new do |s|
  s.name           = 'ArgoSkeleton'
  s.version        = '1.0.0'
  s.summary        = 'Argo skeleton loader: shapes worked out from the views under it'
  s.description    = 'A native view that, while loading, hides what its descendants draw and paints one rounded shape per text line, image and control.'
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
