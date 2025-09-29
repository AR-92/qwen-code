/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach, expect } from 'vitest';
import { ContextManager } from './contextManager.js';
import type { Content } from '@google/genai';

describe('ContextManager', () => {
  let contextManager: ContextManager;

  beforeEach(() => {
    contextManager = new ContextManager();
  });

  it('should initialize with default configuration', () => {
    expect(contextManager).toBeDefined();
  });

  it('should estimate token count correctly', () => {
    const history: Content[] = [
      {
        role: 'user',
        parts: [
          { text: 'Hello, how are you?' },
          { text: 'This is another message with more content.' }
        ]
      }
    ];

    const tokens = (contextManager as any).estimateTokenCount(history);
    expect(tokens).toBeGreaterThan(0);
  });

  it('should extract knowledge from text', () => {
    const text = "Important: Remember that the API key should be stored in environment variables. Decision: We will use OAuth for authentication.";
    const timestamp = Date.now();
    const knowledge = (contextManager as any).extractKnowledgeFromText(text, timestamp, 'test-job');

    expect(knowledge).toHaveLength(3);
    expect(knowledge[0].tags).toContain('important-note');
    expect(knowledge[1].tags).toContain('decision');
    expect(knowledge[2].tags).toContain('preference');
  });

  it('should filter context correctly', () => {
    const history: Content[] = [
      { role: 'user', parts: [{ text: 'What is the weather?' }] },
      { role: 'model', parts: [{ text: 'The weather is sunny.' }] },
      { role: 'user', parts: [{ text: 'Thanks for the info.' }] }
    ];

    const filtered = (contextManager as any).filterContext(history);
    expect(filtered).toHaveLength(3);
    expect(filtered[0].role).toBe('user');
    expect(filtered[1].role).toBe('model');
  });

  it('should manage knowledge base', () => {
    const knowledge = {
      id: 'test-1',
      content: 'Test knowledge entry',
      timestamp: Date.now(),
      tags: ['test'],
      source: 'test-job'
    };

    contextManager.addKnowledge(knowledge);
    const allKnowledge = contextManager.getAllKnowledge();
    expect(allKnowledge).toHaveLength(1);
    expect(allKnowledge[0].id).toBe('test-1');
  });
});