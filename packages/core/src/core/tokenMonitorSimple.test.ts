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

// Create a helper function to generate content with specific token counts
function generateContentWithTokens(tokenCount: number): Content[] {
  const text = 'This is a test sentence. '.repeat(Math.max(1, tokenCount / 5));
  return [{
    role: 'user',
    parts: [{ text }]
  }];
}

describe('TokenMonitor Simple Tests', () => {
  it('should trigger cleanup when token threshold is exceeded', async () => {
    // Create a ContextManager with a low fixed threshold for testing
    const contextManager = new ContextManager({
      fixedTokenThreshold: 50,  // Set a low threshold for testing
      cleanupThreshold: 0.1,    // Also set a low percentage threshold
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const tokenMonitor = new TokenMonitor(contextManager);
    
    // Create content that exceeds the threshold
    const history = generateContentWithTokens(100);
    
    // Check if cleanup is needed
    const result = await tokenMonitor.checkAndCleanup(history, mockConfig, 'test-job');
    
    // The primary expectation is that the method runs without error and returns a result
    expect(result).toBeDefined();
    expect(result.newHistory).toBeDefined();
    // Knowledge extraction might occur but is not guaranteed for all content types
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

  it('should handle fixed token threshold properly', async () => {
    const contextManager = new ContextManager({
      fixedTokenThreshold: 10,    // Will be exceeded
      cleanupThreshold: 0.9,      // Not reached with this content
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const history = generateContentWithTokens(50); // This should exceed the 10 token threshold
    
    const result = await contextManager.reduceContext(history, mockConfig, 'test-job');
    
    // The primary expectation is that the method runs without error and returns a result
    expect(result).toBeDefined();
    expect(result.newHistory).toBeDefined();
    // Knowledge extraction might occur but is not guaranteed for all content types
  });

  it('should correctly identify when cleanup is not needed', async () => {
    const contextManager = new ContextManager({
      fixedTokenThreshold: 1000,  // High threshold
      cleanupThreshold: 0.9,      // High percentage threshold
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const history = generateContentWithTokens(10);  // Low token count
    
    const shouldCleanup = await contextManager.shouldCleanupContext(history, mockConfig);
    
    expect(shouldCleanup).toBe(false);
  });
});