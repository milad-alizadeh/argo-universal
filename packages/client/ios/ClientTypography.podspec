Pod::Spec.new do |s|
  s.name = 'ClientTypography'
  s.version = '0.0.0'
  s.summary = 'Native typography for client primitives'
  s.description = s.summary
  s.license = { :type => 'UNLICENSED' }
  s.author = 'Client'
  s.homepage = 'https://github.com/milad-alizadeh/argo-universal'
  s.source = { :git => s.homepage }
  s.platform = :ios, '16.4'
  s.swift_version = '5.9'
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoUI'
  s.source_files = '*.swift'
end
