/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { render } from 'ink-testing-library';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Header } from './Header.js';
import * as useTerminalSize from '../hooks/useTerminalSize.js';
// import { longAsciiLogo } from './AsciiArt.js';  // Not currently used in this test file

vi.mock('../hooks/useTerminalSize.js');

describe('<Header />', () => {
  beforeEach(() => {});

  it('renders the long logo on a wide terminal', () => {
    vi.spyOn(useTerminalSize, 'useTerminalSize').mockReturnValue({
      columns: 120,
      rows: 20,
    });
    const { lastFrame } = render(<Header version="1.0.0" nightly={false} />);
    
    // Compare the core content since ink may trim whitespace
    const rendered = lastFrame();
    
    // The long logo has specific lines - let's check if the main content is present
    expect(rendered).toContain('██╗      ███████╗██╗   ██╗ █████╗');
    expect(rendered).toContain('╚██╗     ██╔════╝██║   ██║██╔══██╗');
    expect(rendered).toContain(' ╚██╗    █████╗  ██║   ██║███████║');
    expect(rendered).toContain(' ██╔╝    ██╔══╝  ╚██╗ ██╔╝██╔══██║');
    expect(rendered).toContain('██╔╝     ███████╗ ╚████╔╝ ██║  ██║');
    expect(rendered).toContain('╚═╝      ╚══════╝  ╚═══╝  ╚═╝  ╚═╝');
  });

  it('renders custom ASCII art when provided', () => {
    const customArt = 'CUSTOM ART';
    const { lastFrame } = render(
      <Header version="1.0.0" nightly={false} customAsciiArt={customArt} />,
    );
    expect(lastFrame()).toContain(customArt);
  });

  it('displays the version number when nightly is true', () => {
    const { lastFrame } = render(<Header version="1.0.0" nightly={true} />);
    expect(lastFrame()).toContain('v1.0.0');
  });

  it('does not display the version number when nightly is false', () => {
    const { lastFrame } = render(<Header version="1.0.0" nightly={false} />);
    expect(lastFrame()).not.toContain('v1.0.0');
  });
});
