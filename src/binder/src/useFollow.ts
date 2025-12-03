import {
  ref,
  watch,
  watchEffect,
  toRef,
  nextTick,
  onMounted,
  onBeforeUnmount,
  type Ref,
  type CSSProperties,
  type MaybeRef
} from 'vue'
import { onFontsReady } from 'vooks'
import { beforeNextFrameOnce } from 'seemly'
import { on, off } from 'evtd'
import {
  ensureViewBoundingRect,
  getScrollParent,
  getRect,
  getPointRect
} from './utils'
import {
  getPlacementAndOffsetOfFollower,
  getProperTransformOrigin,
  getOffset
} from './get-placement-style'
import type { Placement, Rect } from './interface'

type Strategy = 'fixed' | 'absolute'

type SyncTrigger = Array<'scroll' | 'resize'>

export interface UseFollowOptions {
  targetRef: Ref<Element | null>
  followerRef: Ref<HTMLElement | null>
  enabledRef: Ref<boolean>
  placement?: MaybeRef<Placement>
  strategy?: MaybeRef<Strategy>
  flip?: MaybeRef<boolean>
  internalShift?: MaybeRef<boolean>
  overlap?: MaybeRef<boolean>
  width?: MaybeRef<'target' | string | undefined>
  minWidth?: MaybeRef<'target' | string | undefined>
  x?: MaybeRef<number | undefined>
  y?: MaybeRef<number | undefined>
  zIndex?: MaybeRef<number | undefined>
  syncTrigger?: MaybeRef<SyncTrigger>
}

export interface UseFollowReturns {
  placement: Ref<Placement>
  actualPlacement: Ref<Placement>
  strategy: Ref<Strategy>
  flip: Ref<boolean>
  internalShift: Ref<boolean>
  overlap: Ref<boolean>
  width: Ref<'target' | string | undefined>
  minWidth: Ref<'target' | string | undefined>
  x: Ref<number | undefined>
  y: Ref<number | undefined>
  zIndex: Ref<number | undefined>
  syncTrigger: Ref<SyncTrigger>
  floatingStyles: Ref<CSSProperties>
  transformOrigin: Ref<string>
  syncPosition: () => void
}

const isBrowser = typeof window !== 'undefined'

function createViewRect (): Rect {
  const viewRect = ensureViewBoundingRect()
  return {
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: viewRect.width,
    height: viewRect.height
  }
}

export function useFollow (options: UseFollowOptions): UseFollowReturns {
  const {
    targetRef,
    followerRef,
    enabledRef,
    placement = 'bottom',
    strategy = 'fixed',
    flip = true,
    internalShift = false,
    overlap = false,
    width,
    minWidth,
    x,
    y,
    zIndex,
    syncTrigger = ['scroll', 'resize']
  } = options

  const placementRef = toRef(placement)
  const renderedPlacementRef = ref<Placement>('bottom')
  const strategyRef = toRef(strategy)
  const flipRef = toRef(flip)
  const internalShiftRef = toRef(internalShift)
  const overlapRef = toRef(overlap)
  const widthRef = toRef(width)
  const minWidthRef = toRef(minWidth)
  const xRef = toRef(x)
  const yRef = toRef(y)
  const zIndexRef = toRef(zIndex)
  const syncTriggerRef = toRef(syncTrigger)
  const transformOriginRef = ref('top center')
  const floatingStylesRef = ref<CSSProperties>({
    position: strategyRef.value,
    left: '0px',
    top: '0px',
    transform: 'translate3d(0, 0, 0)',
    transformOrigin: transformOriginRef.value
  })

  const scheduleSync = (): void => {
    beforeNextFrameOnce(syncPosition)
  }
  const syncOnNextTick = (): void => {
    void nextTick()
      .then(syncPosition)
      .catch((error) => {
        console.error('[vueuc:useFollow] sync failed', error)
      })
  }

  let scrollParents: Array<Element | Document> = []
  const handleScroll = (): void => {
    scheduleSync()
  }
  const ensureScrollListeners = (): void => {
    if (!isBrowser || !syncTriggerRef.value.includes('scroll')) return
    teardownScrollListeners()
    let cursor: Node | null = targetRef.value
    while (cursor !== null) {
      cursor = getScrollParent(cursor)
      if (cursor === null) break
      scrollParents.push(cursor as Element | Document)
      on('scroll', cursor as Element | Document, handleScroll, true)
    }
  }
  const teardownScrollListeners = (): void => {
    for (const parent of scrollParents) {
      off('scroll', parent, handleScroll, true)
    }
    scrollParents = []
  }

  let removeResizeListener: (() => void) | null = null
  const handleResize = (): void => {
    scheduleSync()
  }
  const ensureResizeListener = (): void => {
    if (!isBrowser || !syncTriggerRef.value.includes('resize')) return
    if (removeResizeListener !== null) return
    on('resize', window, handleResize)
    removeResizeListener = () => {
      off('resize', window, handleResize)
      removeResizeListener = null
    }
  }
  const teardownResizeListener = (): void => {
    if (removeResizeListener !== null) {
      removeResizeListener()
    }
  }
  const ensureListeners = (): void => {
    if (!enabledRef.value) return
    if (syncTriggerRef.value.includes('scroll')) {
      ensureScrollListeners()
    } else {
      teardownScrollListeners()
    }
    if (syncTriggerRef.value.includes('resize')) {
      ensureResizeListener()
    } else {
      teardownResizeListener()
    }
  }
  const teardownListeners = (): void => {
    teardownScrollListeners()
    teardownResizeListener()
  }

  const syncPosition = (): void => {
    if (!enabledRef.value) return
    const follower = followerRef.value
    if (follower === null) return
    const specifiedX = xRef.value
    const specifiedY = yRef.value
    const usePoint = specifiedX !== undefined && specifiedY !== undefined
    const target = targetRef.value
    if (!usePoint && target === null) return
    const targetRect = usePoint
      ? getPointRect(specifiedX!, specifiedY!)
      : getRect(target as Element)
    const followerRect = getRect(follower)
    const targetWidth = Math.round(targetRect.width)
    const targetHeight = Math.round(targetRect.height)
    const followerStyle = follower.style
    followerStyle.setProperty('--v-target-width', `${targetWidth}px`)
    followerStyle.setProperty('--v-target-height', `${targetHeight}px`)
    const widthStyle = widthRef.value === 'target'
      ? `${targetWidth}px`
      : widthRef.value
    const minWidthStyle = minWidthRef.value === 'target'
      ? `${targetWidth}px`
      : minWidthRef.value
    const offsetContainerRect = createViewRect()
    const {
      left: offsetLeft,
      top: offsetTop,
      placement: properPlacement
    } = getPlacementAndOffsetOfFollower(
      placementRef.value,
      targetRect,
      followerRect,
      internalShiftRef.value,
      flipRef.value,
      overlapRef.value
    )
    renderedPlacementRef.value = properPlacement
    const properTransformOrigin = getProperTransformOrigin(
      properPlacement,
      overlapRef.value
    )
    transformOriginRef.value = properTransformOrigin
    const { left, top, transform } = getOffset(
      properPlacement,
      offsetContainerRect,
      targetRect,
      offsetTop,
      offsetLeft,
      overlapRef.value
    )
    follower.setAttribute('v-placement', properPlacement)
    if (overlapRef.value) {
      follower.setAttribute('v-overlap', '')
    } else {
      follower.removeAttribute('v-overlap')
    }
    followerStyle.setProperty(
      '--v-offset-left',
      `${Math.round(offsetLeft)}px`
    )
    followerStyle.setProperty('--v-offset-top', `${Math.round(offsetTop)}px`)
    followerStyle.setProperty('--v-transform-origin', properTransformOrigin)
    const nextStyles: CSSProperties = {
      position: strategyRef.value,
      left: '0px',
      top: '0px',
      transform: `translateX(${left}) translateY(${top}) ${transform}`,
      transformOrigin: properTransformOrigin
    }
    if (widthStyle !== undefined) {
      nextStyles.width = widthStyle
    }
    if (minWidthStyle !== undefined) {
      nextStyles.minWidth = minWidthStyle
    }
    if (zIndexRef.value !== undefined) {
      nextStyles.zIndex = zIndexRef.value
    }
    floatingStylesRef.value = nextStyles
  }

  watchEffect((onCleanup) => {
    if (!enabledRef.value) {
      teardownListeners()
      return
    }
    ensureListeners()
    onCleanup(() => {
      teardownListeners()
    })
  })

  watch(enabledRef, (value) => {
    if (value) {
      syncOnNextTick()
    }
  }, { immediate: true })

  watch([targetRef, followerRef], () => {
    if (enabledRef.value) {
      syncOnNextTick()
    }
  })

  watch([
    placementRef,
    xRef,
    yRef,
    flipRef,
    internalShiftRef,
    overlapRef,
    widthRef,
    minWidthRef,
    strategyRef,
    zIndexRef
  ], () => {
    if (enabledRef.value) {
      syncOnNextTick()
    }
  })

  onMounted(() => {
    if (enabledRef.value) {
      ensureListeners()
      syncPosition()
    }
  })

  onFontsReady(() => {
    if (enabledRef.value) {
      syncPosition()
    }
  })

  onBeforeUnmount(() => {
    teardownListeners()
  })

  return {
    placement: placementRef,
    actualPlacement: renderedPlacementRef,
    strategy: strategyRef,
    flip: flipRef,
    internalShift: internalShiftRef,
    overlap: overlapRef,
    width: widthRef,
    minWidth: minWidthRef,
    x: xRef,
    y: yRef,
    zIndex: zIndexRef,
    syncTrigger: syncTriggerRef,
    floatingStyles: floatingStylesRef,
    transformOrigin: transformOriginRef,
    syncPosition
  }
}
