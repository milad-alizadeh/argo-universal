import type { StaleMark } from '@repo/contracts/plugins/page-address';

// A mark naming no address reaches every page of its Plugin; one naming addresses reaches the pages at their paths.
const reaches = (mark: StaleMark, path: string): boolean =>
  mark.addresses?.some((address) => address.path === path) ?? true;

/*
 * The stale marks the Server sent a test's Plugin, as the App hears them, so an open page draws again only when one
 * reaches it (ADR-0060).
 */
export class PageMarks {
  private readonly marks: StaleMark[] = [];

  public constructor(
    stale: AsyncGenerator<StaleMark>,
    private readonly pluginId: string,
  ) {
    void this.follow(stale);
  }

  private async follow(stale: AsyncGenerator<StaleMark>): Promise<void> {
    for await (const mark of stale)
      if (mark.pluginId === this.pluginId) this.marks.push(mark);
  }

  // How many marks were heard, to ask later what came after.
  get heard(): number {
    return this.marks.length;
  }

  // Whether a mark heard since `heard` reaches the page at `path`.
  reachedSince(heard: number, path: string): boolean {
    return this.marks.slice(heard).some((mark) => reaches(mark, path));
  }
}
