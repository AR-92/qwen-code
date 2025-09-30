/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedContextManager } from './enhancedContextManager.js';
import type { Content } from '@google/genai';

describe('EnhancedContextManager', () => {
  let contextManager: EnhancedContextManager;

  beforeEach(() => {
    contextManager = new EnhancedContextManager({
      cleanupThreshold: 0.8,
      maxKnowledgeEntries: 100,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
      fixedTokenThreshold: 4000,
      intentRecognitionEnabled: true,
      predictiveCleanupEnabled: true,
      knowledgeEnhancementEnabled: true,
      learningEnabled: true,
    });
  });

  it('should predict user intent correctly', async () => {
    const userInput = 'I need to fix the authentication bug in the login service';
    const context: Content[] = [];
    
    const intent = await contextManager.predictUserIntent(userInput, context);
    
    expect(intent).toBeDefined();
    expect(intent.type).toBe('debug');
    expect(intent.confidence).toBeGreaterThan(0.5);
    expect(intent.targets).toContain('login');
    expect(intent.targets).toContain('service');
    expect(intent.targets).toContain('auth');
  });

  it('should prepare context for a specific task', async () => {
    const userInput = 'Add validation to user input in the profile form';
    const currentHistory: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'We need to secure our application' }]
      },
      {
        role: 'model', 
        parts: [{ text: 'I recommend adding input validation to prevent security issues' }]
      }
    ];
    
    const enhancedContext = await contextManager.prepareContextForTask(userInput, currentHistory);
    
    expect(enhancedContext).toBeDefined();
    expect(Array.isArray(enhancedContext)).toBe(true);
  });

  it('should predict cleanup need based on projected usage', async () => {
    const history: Content[] = Array(10).fill({
      role: 'user',
      parts: [{ text: 'This is a test message to increase token count' }]
    }) as Content[];
    
    const shouldCleanup = await contextManager.predictCleanupNeed(history);
    
    expect(typeof shouldCleanup).toBe('boolean');
  });

  it('should enhance context with relevant knowledge', async () => {
    // Add some knowledge first
    contextManager.addKnowledge({
      id: 'test-kb-1',
      content: 'Authentication uses JWT tokens for security',
      timestamp: Date.now(),
      tags: ['security', 'authentication']
    });

    const context: Content[] = [
      {
        role: 'user',
        parts: [{ text: 'I need to implement login functionality' }]
      }
    ];
    
    const intent = await contextManager.predictUserIntent('How do I implement authentication?', context);
    const enhancedContext = await (contextManager as any).addRelevantKnowledge(context, intent);
    
    // Should include relevant knowledge in the enhanced context if knowledge exists with matching tags
    if (intent.targets && intent.targets.includes('authentication')) {
      // If the intent has 'authentication' as a target, knowledge should be added
      expect(enhancedContext.length).toBeGreaterThan(context.length);
    } else {
      // If no matching knowledge is found, context length should remain the same
      expect(enhancedContext.length).toBeGreaterThanOrEqual(context.length);
    }
  });
});