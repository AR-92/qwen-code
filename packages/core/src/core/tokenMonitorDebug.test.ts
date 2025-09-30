/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextManager } from './contextManager.js';
import { TokenMonitor } from './tokenMonitor.js';
import type { Content } from '@google/genai';
import { describe, it, expect } from 'vitest';
import type { Config } from '../config/config.js';

// Mock configuration for testing
const mockConfig = {
  getModel: () => 'gemini-2.0-flash',
} as Config;

// Create a helper function to generate content with specific character counts (which will translate to tokens)
function generateContentWithChars(charCount: number): Content[] {
  const text = 'x'.repeat(charCount); // Create a string with specific character count
  return [{
    role: 'user',
    parts: [{ text }]
  }];
}

describe('TokenMonitor Debug Tests', () => {
  it('should trigger cleanup when FIXED token threshold is exceeded', async () => {
    // Since our estimation is roughly 1 token per 4 characters, we'll use 200 characters to aim for ~50 tokens
    const contextManager = new ContextManager({
      fixedTokenThreshold: 25,  // Set to trigger at ~100 characters (25 tokens by our estimate)
      cleanupThreshold: 0.9,    // High percentage to avoid triggering that way
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const tokenMonitor = new TokenMonitor(contextManager);
    
    // Create content that should exceed the ~25 token threshold (using 100+ characters)
    const history = generateContentWithChars(150);
    
    // Check if cleanup is needed based on token usage
    const shouldCleanup = await contextManager.shouldCleanupContext(history, mockConfig);
    
    if (shouldCleanup) {
      // Perform the actual cleanup
      const result = await tokenMonitor.checkAndCleanup(history, mockConfig, 'test-job');
      expect(result.knowledgeExtracted.length).toBeGreaterThan(0);
    } else {
      // If cleanup wasn't triggered, that's also valid behavior to test
      expect(shouldCleanup).toBe(true);
    }
  });

  it('should NOT trigger cleanup when token threshold is not exceeded', async () => {
    const contextManager = new ContextManager({
      fixedTokenThreshold: 100,  // High threshold
      cleanupThreshold: 0.9,     // High percentage threshold
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    // Create content with low character count (should be < 100 tokens estimated)
    const history = generateContentWithChars(40);  // ~10 estimated tokens
    
    const shouldCleanup = await contextManager.shouldCleanupContext(history, mockConfig);
    expect(shouldCleanup).toBe(false);
  });

  it('should properly extract knowledge patterns', async () => {
    const contextManager = new ContextManager({
      fixedTokenThreshold: 1000,
      cleanupThreshold: 0.9,
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });
    
    // Create content with knowledge patterns
    const history: Content[] = [{
      role: 'user',
      parts: [{ 
        text: 'Important: This is critical information that should be preserved. ' +
              'Decision: We will implement the feature this way. ' +
              'I need this functionality to work properly.'
      }]
    }];
    
    const result = await contextManager.reduceContext(history, mockConfig, 'test-job');
    
    // Verify that knowledge was extracted
    const hasImportantNote = result.knowledgeExtracted.some(k => k.tags.includes('important-note'));
    const hasDecision = result.knowledgeExtracted.some(k => k.tags.includes('decision'));
    const hasPreference = result.knowledgeExtracted.some(k => k.tags.includes('preference'));
    
    expect(result.knowledgeExtracted.length).toBeGreaterThan(0);
    expect(hasImportantNote).toBe(true);
    expect(hasDecision).toBe(true);
    expect(hasPreference).toBe(true);
  });

  it('should handle TokenMonitor checkAndCleanup function properly', async () => {
    const contextManager = new ContextManager({
      fixedTokenThreshold: 20,    // Low threshold
      cleanupThreshold: 0.9,      // High percentage to not trigger
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const tokenMonitor = new TokenMonitor(contextManager);
    const history = generateContentWithChars(100); // Should be > 20 estimated tokens
    
    const result = await tokenMonitor.checkAndCleanup(history, mockConfig, 'test-job');
    expect(result.knowledgeExtracted.length).toBeGreaterThan(0);
  });
});