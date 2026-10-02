export const MAX_TAG_COUNT = 10;
export type TagAppendResult = { tags: string[]; added: boolean; error?: 'duplicate' | 'max' };
export function appendTag(tags: string[], input: string): TagAppendResult {
  const tag = input.trim();
  if (!tag) return { tags, added: false };
  if (tags.includes(tag)) return { tags, added: false, error: 'duplicate' };
  if (tags.length >= MAX_TAG_COUNT) return { tags, added: false, error: 'max' };
  return { tags: [...tags, tag], added: true };
}
export function removeTagAt(tags: string[], index: number): string[] { return tags.filter((_, i) => i !== index); }
