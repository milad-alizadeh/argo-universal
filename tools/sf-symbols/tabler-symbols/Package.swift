// swift-tools-version:5.9
import PackageDescription

// CGPath.normalized(using:), which unions the outlined strokes, needs macOS 14.
let package = Package(
  name: "tabler-symbols",
  platforms: [.macOS(.v14)],
  targets: [.executableTarget(name: "tabler-symbols", path: "Sources")]
)
