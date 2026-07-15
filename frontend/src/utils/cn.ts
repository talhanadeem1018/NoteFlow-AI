/**
 * Merge class names conditionally.
 * Simple utility – no external deps needed.
 */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
