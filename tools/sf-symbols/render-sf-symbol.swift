import AppKit

// Writes one SF Symbol as a PNG to stdout: render-sf-symbol <name> <pointSize>.
let arguments = CommandLine.arguments
guard arguments.count == 3,
  let pointSize = Double(arguments[2]),
  let symbol = NSImage(systemSymbolName: arguments[1], accessibilityDescription: nil),
  let image = symbol.withSymbolConfiguration(.init(pointSize: pointSize, weight: .regular)),
  let tiff = image.tiffRepresentation,
  let png = NSBitmapImageRep(data: tiff)?.representation(using: .png, properties: [:])
else { exit(1) }
FileHandle.standardOutput.write(png)
