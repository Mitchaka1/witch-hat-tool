type PageWithUses = {
  remainingUses: number;
};

export function findUsablePageIndex(
  pages: readonly PageWithUses[],
  currentIndex: number,
  direction: number,
  includeCurrent = false,
) {
  if (pages.length === 0) return -1;

  const step = direction < 0 ? -1 : 1;
  const firstOffset = includeCurrent ? 0 : 1;

  for (let offset = firstOffset; offset < pages.length + firstOffset; offset++) {
    const index =
      ((currentIndex + offset * step) % pages.length + pages.length) %
      pages.length;

    if (pages[index].remainingUses > 0) return index;
  }

  return -1;
}
