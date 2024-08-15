export const getScrollableParent = (
  element: HTMLElement | null,
  orientation: 'horizontal' | 'vertical' | 'both',
): Window | HTMLElement | undefined => {
  if (!element) {
    return undefined
  }

  let parent = element.parentElement

  while (parent) {
    const { overflowY, overflowX } = window.getComputedStyle(parent)

    const isScrollable =
      orientation === 'vertical' || orientation === 'both'
        ? isOverflowScrollable(overflowY) &&
        parent.offsetHeight < parent.scrollHeight
        : isOverflowScrollable(overflowX) &&
        parent.offsetWidth < parent.scrollWidth

    if (isScrollable) {
      return parent
    }

    parent = parent.parentElement
  }

  return window
}

const isOverflowScrollable = (overflow: string) =>
  overflow.split(' ').every((value) => value === 'auto' || value === 'scroll')
