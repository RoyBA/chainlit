import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react';

import { DisplayMode } from '../types';

const SIDEBAR_MIN_WIDTH = 300;
const SIDEBAR_DEFAULT_WIDTH = 400;
const SIDEBAR_MAX_WIDTH_RATIO = 0.5;
const LS_WIDTH_KEY = 'chainlit-copilot-sidebarWidth';
const HOST_WRAPPER_ID = 'chainlit-copilot-host-wrapper';
const COPILOT_CONTAINER_ID = 'chainlit-copilot';
const SIDEBAR_TRANSITION = 'width 0.3s ease-in-out';

interface UseSidebarResizeOptions {
  displayMode: DisplayMode;
  isOpen: boolean;
}

interface UseSidebarResizeReturn {
  sidebarWidth: number;
  handleMouseDown: () => void;
}

function getHostWrapper(): HTMLElement | null {
  return document.getElementById(HOST_WRAPPER_ID);
}

// Move every host <body> child (except the copilot widget container) into a single
// wrapper element we control. Sizing this wrapper — instead of nudging the host via
// document.body's margin — shrinks the host area reliably, even when the host renders
// viewport-anchored content (position: fixed / inset: 0 / width: 100vw) that ignores a
// body margin.
function createHostWrapper(): HTMLElement {
  const body = document.body;
  const wrapper = document.createElement('div');
  wrapper.id = HOST_WRAPPER_ID;

  Array.from(body.childNodes).forEach((node) => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).id === COPILOT_CONTAINER_ID
    ) {
      return;
    }
    wrapper.appendChild(node);
  });

  body.insertBefore(wrapper, body.firstChild);
  return wrapper;
}

// Restore the original DOM: move the wrapper's children back onto <body>, then drop it.
function removeHostWrapper(): void {
  const wrapper = getHostWrapper();
  if (!wrapper) return;

  const body = document.body;
  while (wrapper.firstChild) {
    body.insertBefore(wrapper.firstChild, wrapper);
  }
  wrapper.remove();
}

export function useSidebarResize({
  displayMode,
  isOpen
}: UseSidebarResizeOptions): UseSidebarResizeReturn {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const stored = localStorage.getItem(LS_WIDTH_KEY);
    return stored ? Number(stored) : SIDEBAR_DEFAULT_WIDTH;
  });
  const isDragging = useRef(false);

  useEffect(() => {
    if (displayMode === 'sidebar') {
      localStorage.setItem(LS_WIDTH_KEY, String(sidebarWidth));
    }
  }, [sidebarWidth, displayMode]);

  const setWrapperTransition = useCallback((enabled: boolean) => {
    const wrapper = getHostWrapper();
    if (wrapper) {
      wrapper.style.transition = enabled ? SIDEBAR_TRANSITION : '';
    }
  }, []);

  const stopDragging = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    setWrapperTransition(true);
  }, [setWrapperTransition]);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    setWrapperTransition(false);
  }, [setWrapperTransition]);

  useEffect(() => {
    if (displayMode !== 'sidebar' || !isOpen) return;

    function onMouseMove(e: MouseEvent): void {
      if (!isDragging.current) return;
      const maxWidth = window.innerWidth * SIDEBAR_MAX_WIDTH_RATIO;
      const newWidth = Math.min(
        maxWidth,
        Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth - e.clientX)
      );
      setSidebarWidth(newWidth);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', stopDragging);
    window.addEventListener('blur', stopDragging);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('blur', stopDragging);
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.userSelect = '';
      }
    };
  }, [stopDragging, displayMode, isOpen]);

  // While the sidebar is open, wrap the host content and constrain it so the fixed
  // sidebar sits beside it rather than on top of it. Runs as a layout effect to avoid
  // a flash of unconstrained content.
  useLayoutEffect(() => {
    if (displayMode !== 'sidebar' || !isOpen) return;

    const body = document.body;
    const { scrollX, scrollY } = window;

    // Snapshot the original body child order — the widget container isn't always the
    // last child, so we restore this exact order on close.
    const originalOrder = Array.from(body.childNodes);

    // Preserve the host's inline body margins so we can restore them on close.
    const previousMargin = {
      top: body.style.marginTop,
      right: body.style.marginRight,
      bottom: body.style.marginBottom,
      left: body.style.marginLeft
    };

    const wrapper = createHostWrapper();

    // Zero the body margins so the wrapper's viewport-based width math is exact.
    body.style.margin = '0';

    wrapper.style.boxSizing = 'border-box';
    wrapper.style.height = '100vh';
    // Keep vertical scrolling, but clip horizontal overflow instead of showing a
    // scrollbar. Host layouts that don't reflow (e.g. hard-coded 100vw / fixed
    // widths) stay clipped to the reduced width rather than scrolling under the sidebar.
    wrapper.style.overflowX = 'hidden';
    wrapper.style.overflowY = 'auto';
    wrapper.style.transition = SIDEBAR_TRANSITION;
    // A transform makes the wrapper the containing block for its position:
    // fixed/absolute descendants, so viewport-anchored host layouts reflow within the
    // reduced width when they can.
    wrapper.style.transform = 'translateZ(0)';

    // Scrolling now happens on the wrapper, so carry over the host scroll position.
    wrapper.scrollTop = scrollY;
    wrapper.scrollLeft = scrollX;

    return () => {
      // Carry the wrapper's live scroll back to the window so closing doesn't jump
      // to the pre-open position.
      const restoreScrollX = wrapper.scrollLeft;
      const restoreScrollY = wrapper.scrollTop;

      removeHostWrapper();
      // removeHostWrapper drops nodes that followed the widget in front of it; replay
      // the original order so host sibling order is preserved.
      originalOrder.forEach((node) => body.appendChild(node));

      body.style.marginTop = previousMargin.top;
      body.style.marginRight = previousMargin.right;
      body.style.marginBottom = previousMargin.bottom;
      body.style.marginLeft = previousMargin.left;
      window.scrollTo(restoreScrollX, restoreScrollY);
    };
  }, [displayMode, isOpen]);

  // Keep the wrapper width in sync with the sidebar width (persisted width / drag).
  useLayoutEffect(() => {
    if (displayMode !== 'sidebar' || !isOpen) return;
    const wrapper = getHostWrapper();
    if (wrapper) {
      wrapper.style.width = `calc(100vw - ${sidebarWidth}px)`;
    }
  }, [sidebarWidth, displayMode, isOpen]);

  return { sidebarWidth, handleMouseDown };
}
