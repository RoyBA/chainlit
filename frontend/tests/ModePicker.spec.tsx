import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModePicker } from '@/components/chat/MessageComposer/ModePicker';

vi.mock('@chainlit/react-client', async () => {
  const React = await import('react');
  return {
    ChainlitContext: React.createContext(undefined)
  };
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const mode = {
  id: 'model',
  name: 'Model',
  options: [
    { id: 'fast', name: 'Fast' },
    { id: 'smart', name: 'Smart' }
  ]
};

const renderComponent = () =>
  render(<ModePicker mode={mode as any} onOptionSelect={vi.fn()} />);

describe('ModePicker — shadow DOM popover positioning', () => {
  afterEach(() => {
    window.cl_shadowRootElement = undefined;
  });

  it('portals the popover into window.cl_shadowRootElement', () => {
    const shadowContainer = document.createElement('div');
    document.body.appendChild(shadowContainer);
    window.cl_shadowRootElement = shadowContainer as HTMLDivElement;

    renderComponent();
    fireEvent.click(screen.getByRole('button'));

    expect(
      shadowContainer.querySelector('#mode-picker-popover-model')
    ).not.toBeNull();
    shadowContainer.remove();
  });

  it('gives the popover content a stacking z-index above the chat', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button'));

    const content = document.getElementById('mode-picker-popover-model');
    expect(content).not.toBeNull();
    expect(content?.classList.contains('z-[51]')).toBe(true);
  });
});
