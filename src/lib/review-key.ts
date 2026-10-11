export function reviewKeyValid(key: string | undefined): boolean {
  const expected = process.env.REVIEW_KEY;
  return Boolean(expected) && key === expected;
}
