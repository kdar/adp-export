const scrollAmount = 5

export const scrollEffectCallback = (
  scrollableParent: HTMLElement | Window | undefined,
  directParent: HTMLElement | null,
  orientation: 'horizontal' | 'vertical' | 'both',
  mouseX: number,
  mouseY: number,
) => {
  if (!scrollableParent || !directParent) return

  const { innerHeight: windowHeight, innerWidth: windowWidth } = window

  const {
    top: scrollableTop,
    left: scrollableLeft,
    right: scrollableRight,
    width: scrollableWidth,
    bottom: scrollableBottom,
    height: scrollableHeight,
  } = 'getBoundingClientRect' in scrollableParent
      ? scrollableParent.getBoundingClientRect()
      : {
        top: 0,
        bottom: window.innerHeight,
        height: window.innerHeight,
        left: 0,
        right: window.innerWidth,
        width: window.innerWidth,
      }

  const {
    bottom: parentBottom,
    top: parentTop,
    left: parentLeft,
    right: parentRight,
  } = directParent.getBoundingClientRect()

  if (orientation === 'horizontal' || orientation === 'both') {
    processScroll(
      scrollableParent,
      'horizontal',
      mouseX,
      scrollableLeft,
      scrollableRight,
      parentLeft,
      parentRight,
      scrollableWidth,
      windowWidth,
    )
  }

  if (orientation === 'vertical' || orientation === 'both') {
    processScroll(
      scrollableParent,
      'vertical',
      mouseY,
      scrollableTop,
      scrollableBottom,
      parentTop,
      parentBottom,
      scrollableHeight,
      windowHeight,
    )
  }
}

const processScroll = (
  scrollableParent: HTMLElement | Window,
  orientation: 'vertical' | 'horizontal',
  mouseXOrY: number,
  scrollableTopOrLeft: number,
  scrollableBottomOrRight: number,
  parentTopOrLeft: number,
  parentBottomOrRight: number,
  scrollableHeightOrWidth: number,
  windowHeightOrWidth: number,
) => {
  const topOrLeft = Math.max(scrollableTopOrLeft, parentTopOrLeft, 0)

  const bottomOrLeft = Math.min(
    scrollableBottomOrRight,
    parentBottomOrRight,
    windowHeightOrWidth,
  )

  const pad = Math.max(
    Math.min(
      windowHeightOrWidth,
      scrollableBottomOrRight - scrollableTopOrLeft,
    ) / 10,
    50,
  )

  const scrollTop =
    mouseXOrY <= topOrLeft + pad && scrollableTopOrLeft + pad >= parentTopOrLeft

  if (scrollTop) {
    return scroll(scrollableParent, orientation, -1)
  }

  const scrollBottom =
    mouseXOrY >= bottomOrLeft - pad &&
    scrollableBottomOrRight - pad < parentBottomOrRight

  if (scrollBottom) {
    return scroll(scrollableParent, orientation, 1)
  }

  return 0
}

const scroll = (
  scrollableParent: HTMLElement | Window,
  orientation: 'horizontal' | 'vertical',
  signum: -1 | 1,
) => {
  const quantity = signum * scrollAmount

  orientation === 'vertical'
    ? scrollableParent.scrollBy(0, quantity)
    : scrollableParent.scrollBy(quantity, 0)

  return quantity
}
