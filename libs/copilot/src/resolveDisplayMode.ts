import { DisplayMode } from './types';

export const LS_DISPLAY_MODE_KEY = 'chainlit-copilot-displayMode';

export const LS_LARGE_TEXT_KEY = 'chainlit-copilot-largeText';

export function resolveDisplayMode(
  configDisplayMode: DisplayMode | undefined
): DisplayMode {
  return (
    configDisplayMode ||
    (localStorage.getItem(LS_DISPLAY_MODE_KEY) as DisplayMode) ||
    'floating'
  );
}

export function resolveLargeText(): boolean {
  return localStorage.getItem(LS_LARGE_TEXT_KEY) === 'true';
}
