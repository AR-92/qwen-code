import { COLOR_OPTIONS } from './constants.js';

export const shouldShowColor = (color?: string): boolean =>
  color !== undefined && color !== 'auto';

export const getColorForDisplay = (colorName?: string): string | undefined =>
  !colorName || colorName === 'auto'
    ? undefined
    : COLOR_OPTIONS.find((color) => color.name === colorName)?.value;

/**
 * Sanitizes user input by removing dangerous characters and normalizing whitespace.
 */
export function sanitizeInput(input: string): string {
  return (
    input
      .trim()
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
  ); // Limit length
}

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}m ${s}s`;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${m}m`;
}
