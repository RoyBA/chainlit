import { useCallback, useEffect, useRef, useState } from 'react';

import { DisplayMode } from '../types';

const SIDEBAR_MIN_WIDTH = 300;
const SIDEBAR_DEFAULT_WIDTH = 400;
const SIDEBAR_MAX_WIDTH_RATIO = 0.5;
const LS_WIDTH_KEY = 'chainlit-copilot-sidebarWidth';

interface UseSidebarResizeOptions {
  displayMode: DisplayMode;
  isOpen: boolean;
  hostRoot?: string;
}

interface UseSidebarResizeReturn {
  sidebarWidth: number;
  handleMouseDown: () => void;
}

export function useSidebarResize({
  displayMode,
  isOpen,
  hostRoot
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

  const stopDragging = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    document.body.style.userSelect = '';
    document.body.style.transition = 'margin-right 0.3s ease-in-out';
  }, []);

  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.userSelect = 'none';
    document.body.style.transition = '';
  }, []);

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

  // Suspend any containing block the host set on <body> (transform / perspective /
  // will-change) so the fixed sidebar stays anchored to the viewport, then reserve space
  // for it. A viewport-filling host (100vw / absolute inset) can't be shrunk by a body
  // margin, so when `hostRoot` is given we constrain that element's width instead.
  // Everything is restored on close.
  useEffect(() => {
    if (displayMode !== 'sidebar' || !isOpen) return;

    const body = document.body;
    const host = hostRoot
      ? document.querySelector<HTMLElement>(hostRoot)
      : null;

    const prevBody = {
      transform: body.style.transform,
      perspective: body.style.perspective,
      willChange: body.style.willChange,
      marginRight: body.style.marginRight,
      transition: body.style.transition
    };
    body.style.transform = 'none';
    body.style.perspective = 'none';
    body.style.willChange = 'auto';

    const prevHost = host && {
      width: host.style.width,
      overflowX: host.style.overflowX,
      transition: host.style.transition
    };
    if (host) {
      host.style.width = `calc(100vw - ${sidebarWidth}px)`;
      host.style.overflowX = 'hidden';
      host.style.transition = 'width 0.3s ease-in-out';
    } else {
      body.style.marginRight = `${sidebarWidth}px`;
      body.style.transition = 'margin-right 0.3s ease-in-out';
    }

    return () => {
      body.style.transform = prevBody.transform;
      body.style.perspective = prevBody.perspective;
      body.style.willChange = prevBody.willChange;
      if (host && prevHost) {
        host.style.width = prevHost.width;
        host.style.overflowX = prevHost.overflowX;
        host.style.transition = prevHost.transition;
      } else {
        body.style.marginRight = prevBody.marginRight;
        body.style.transition = prevBody.transition;
      }
    };
  }, [displayMode, isOpen, hostRoot]);

  useEffect(() => {
    if (displayMode !== 'sidebar' || !isOpen) return;
    const host = hostRoot
      ? document.querySelector<HTMLElement>(hostRoot)
      : null;
    if (host) {
      host.style.width = `calc(100vw - ${sidebarWidth}px)`;
    } else {
      document.body.style.marginRight = `${sidebarWidth}px`;
    }
  }, [sidebarWidth, displayMode, isOpen, hostRoot]);

  return { sidebarWidth, handleMouseDown };
}
