import { fireEvent, render, screen } from '@testing-library/react';
import { RecoilRoot } from 'recoil';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { commandsState } from '@chainlit/react-client';

import { CommandPopoverButton } from '@/components/chat/MessageComposer/CommandPopoverButton';

vi.mock('components/i18n/Translator', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

vi.mock('@chainlit/react-client', async () => {
  const { atom } = await import('recoil');
  return {
    commandsState: atom({ key: 'commandsState', default: [] })
  };
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const commands = [
  { id: 'Search', description: 'Search the web', icon: 'search', button: false }
];

const renderComponent = () =>
  render(
    <RecoilRoot
      initializeState={({ set }) => set(commandsState, commands as any)}
    >
      <CommandPopoverButton onCommandSelect={vi.fn()} />
    </RecoilRoot>
  );

describe('CommandPopoverButton — shadow DOM popover positioning', () => {
  afterEach(() => {
    window.cl_shadowRootElement = undefined;
  });

  it('portals the popover into window.cl_shadowRootElement', () => {
    const shadowContainer = document.createElement('div');
    document.body.appendChild(shadowContainer);
    window.cl_shadowRootElement = shadowContainer as HTMLDivElement;

    renderComponent();
    fireEvent.click(screen.getByRole('button'));

    expect(shadowContainer.querySelector('#command-popover')).not.toBeNull();
    shadowContainer.remove();
  });

  it('gives the popover content a stacking z-index above the chat', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));

    const content = document.getElementById('command-popover');
    expect(content).not.toBeNull();
    expect(content?.classList.contains('z-[51]')).toBe(true);
  });
});
