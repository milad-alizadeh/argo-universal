/* Generated from ACP Registry 669691cfb847b6e7c911326aabea14e8586c5ae1 by json-schema-to-typescript 16.0.0. */

/**
 * Schema for the aggregated ACP agent registry index
 */
export interface ACPAgentRegistry {
  /**
   * Registry schema version
   */
  version: string;
  /**
   * List of registered agents
   */
  agents: ACPAgent[];
}
/**
 * Schema for ACP agent registry entries
 */
export interface ACPAgent {
  /**
   * Unique agent identifier (lowercase, hyphens allowed)
   */
  id: string;
  /**
   * Display name
   */
  name: string;
  /**
   * Semantic version of the stable release channel
   */
  version: string;
  /**
   * Brief description of the agent
   */
  description: string;
  /**
   * Source code repository URL
   */
  repository?: string;
  /**
   * Project homepage or documentation URL
   */
  website?: string;
  /**
   * List of authors
   */
  authors?: string[];
  /**
   * SPDX license identifier or 'proprietary'
   */
  license?: string;
  /**
   * URL to the license text or terms of service
   */
  license_url?: string;
  /**
   * Icon URL (set automatically by the build from the required icon.svg file)
   */
  icon?: string;
  distribution: {
    binary?: BinaryDistribution;
    npx?: PackageDistribution;
    uvx?: PackageDistribution;
  };
  preview?: PreviewChannel;
  [k: string]: unknown;
}
export interface BinaryDistribution {
  [k: string]: BinaryTarget;
}
export interface BinaryTarget {
  /**
   * URL to download archive (.zip, .tar.gz, .tgz, .tar.bz2, .tbz2, or raw binary). Installer formats (.dmg, .pkg, .deb, .rpm) are not supported.
   */
  archive: string;
  /**
   * Optional SHA-256 checksum of the archive (hex-encoded, 64 characters)
   */
  sha256?: string;
  /**
   * Command to execute after extraction
   */
  cmd: string;
  /**
   * Command line arguments
   */
  args?: string[];
  /**
   * Environment variables
   */
  env?: {
    [k: string]: string;
  };
}
export interface PackageDistribution {
  /**
   * Package name (with optional version)
   */
  package: string;
  /**
   * Command line arguments
   */
  args?: string[];
  /**
   * Environment variables
   */
  env?: {
    [k: string]: string;
  };
}
/**
 * Optional preview (unstable) release channel. Holds only the version and the artifact locations; all other metadata is shared with the stable entry.
 */
export interface PreviewChannel {
  /**
   * Newest known version for the preview channel: X.Y.Z-preview.N, or a plain X.Y.Z release when the stable channel is ahead of the preview line
   */
  version: string;
  /**
   * Preview artifact locations.
   */
  distribution: {
    binary?: BinaryDistribution;
    npx?: PackageDistribution;
    uvx?: PackageDistribution;
  };
}
