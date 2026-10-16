import Foundation

// Prints the filled custom-symbol paths of the Tabler outline SVGs in the folder given (ADR-0019); assets/README.md has the command.
let folder = URL(fileURLWithPath: CommandLine.arguments[1])
print(try symbolPathsJSON(svgFiles(in: folder)))
