import ignore from "ignore";

export class IgnoreMatcher {
  private matcher = ignore();

  add(patterns: string[]): this {
    this.matcher.add(patterns);
    return this;
  }

  test(path: string): boolean {
    if (!path) return false;
    return this.matcher.ignores(path);
  }
}
