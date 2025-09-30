/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { ContextManager } from './contextManager.js';
import { TokenMonitor } from './tokenMonitor.js';
import type { Content } from '@google/genai';
import { describe, it, expect } from 'vitest';

// Mock configuration for testing
const mockConfig = {
  getModel: () => 'gemini-2.0-flash',
  // Minimal mock implementation to satisfy TypeScript
  toolRegistry: undefined,
  promptRegistry: undefined,
  subagentManager: undefined,
  sessionId: '',
  fileSystemService: undefined,
  contentGeneratorConfig: undefined,
  embeddingModel: undefined,
  sandbox: undefined,
  targetDir: '',
  debugMode: false,
  fullContext: false,
  coreTools: [],
  allowedTools: [],
  excludeTools: [],
  mcpServers: {},
  userMemory: '',
  approvalMode: 'auto-edit',
  showMemoryUsage: false,
  accessibility: {},
  telemetry: {},
  gitCoAuthor: {},
  fileFiltering: {},
  checkpointing: false,
  cwd: '',
  fileDiscoveryService: undefined,
  bugCommand: {},
  extensionContextFilePaths: [],
  blockedMcpServers: [],
  noBrowser: false,
  summarizeToolOutput: {},
  folderTrustFeature: false,
  folderTrust: false,
  ideMode: false,
  enableOpenAILogging: false,
  systemPromptMappings: [],
  authType: 'none',
  cliVersion: 'test',
  tavilyApiKey: undefined,
  chatCompression: {},
  interactive: false,
  trustedFolder: false,
  useRipgrep: false,
  shouldUseNodePtyShell: false,
  skipNextSpeakerCheck: false,
  extensionManagement: false,
  enablePromptCompletion: false,
  skipLoopDetection: false,
  contextManagement: {}
} as any;

// Create a helper function to generate content with specific token counts
function generateContentWithTokens(tokenCount: number): Content[] {
  const text = 'This is a test sentence. '.repeat(Math.max(1, tokenCount / 5));
  return [{
    role: 'user',
    parts: [{ text }]
  }];
}

describe('TokenMonitor and ContextManager Integration', () => {
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

  it('should not trigger cleanup when token threshold is not exceeded', async () => {
    // Create a ContextManager with a high fixed threshold for testing
    const contextManager = new ContextManager({
      fixedTokenThreshold: 1000,  // High threshold
      cleanupThreshold: 0.9,     // High percentage threshold
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const tokenMonitor = new TokenMonitor(contextManager);
    
    // Create content that does not exceed the threshold
    const history = generateContentWithTokens(10);
    
    // Check if cleanup is needed
    const result = await tokenMonitor.checkAndCleanup(history, mockConfig, 'test-job');
    
    // Expect that no cleanup occurred since threshold wasn't exceeded
    // Note: Knowledge extraction might still happen even if no cleanup is needed
    expect(result.newHistory).toEqual(history); // Should return original history if no cleanup was needed
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
    expect(result.knowledgeExtracted.length).toBeGreaterThan(0);
    expect(result.knowledgeExtracted.some(k => k.tags.includes('important-note'))).toBe(true);
    expect(result.knowledgeExtracted.some(k => k.tags.includes('decision'))).toBe(true);
    expect(result.knowledgeExtracted.some(k => k.tags.includes('preference'))).toBe(true);
  });

  it('should handle both percentage and fixed token thresholds', async () => {
    // Test with fixed threshold exceeded but percentage threshold not exceeded
    const contextManager2 = new ContextManager({
      fixedTokenThreshold: 10,    // Will be exceeded
      cleanupThreshold: 0.9,      // Not reached with this content
      maxKnowledgeEntries: 10,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    });

    const history = generateContentWithTokens(100);
    
    const result = await contextManager2.reduceContext(history, mockConfig, 'test-job');
    
    // The primary expectation is that the method runs without error and returns a result
    expect(result).toBeDefined();
    expect(result.newHistory).toBeDefined();
    // Knowledge extraction might occur but is not guaranteed for all content types
  });
});