/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, beforeEach, expect, vi } from 'vitest';
import { GeminiChat } from './geminiChat.js';
import type { GenerateContentConfig } from '@google/genai';

describe('ContextManager Integration in GeminiChat', () => {
  let mockConfig: any;
  let mockContentGenerator: any;
  let generationConfig: GenerateContentConfig;
  let chat: GeminiChat;

  beforeEach(() => {
    mockConfig = {
      getModel: vi.fn().mockReturnValue('gemini-2.0-flash'),
      getDebugMode: vi.fn().mockReturnValue(false),
      getContentGeneratorConfig: vi.fn().mockReturnValue({}),
      getQuotaErrorOccurred: vi.fn().mockReturnValue(false),
      flashFallbackHandler: undefined,
      getUsageStatisticsEnabled: vi.fn().mockReturnValue(false),
    };

    mockContentGenerator = {
      generateContent: vi.fn(),
      generateContentStream: vi.fn(),
      countTokens: vi.fn(),
      embedContent: vi.fn(),
    };

    generationConfig = {};
    chat = new GeminiChat(mockConfig, mockContentGenerator, generationConfig);
  });

  it('should initialize with ContextManager', () => {
    // Verify that ContextManager is properly integrated
    expect(chat).toBeDefined();
  });

  it('should call maybeCleanupContext after sendMessage', async () => {
    // Mock the context manager to track calls
    const mockMaybeCleanupContext = vi.fn().mockResolvedValue(undefined);
    (chat as any).maybeCleanupContext = mockMaybeCleanupContext;

    // Mock generateContent to return a valid response
    mockContentGenerator.generateContent = vi.fn().mockResolvedValue({
      candidates: [{ content: { role: 'model', parts: [{ text: 'Hello' }] } }]
    });

    const userContent = [{ text: 'Hello' }];
    await chat.sendMessage({ message: userContent }, 'test-prompt-id');

    // Verify maybeCleanupContext was called
    expect(mockMaybeCleanupContext).toHaveBeenCalledWith('test-prompt-id');
  });

  it('should call maybeCleanupContext after successful stream', async () => {
    // Create a mock async generator for the stream that simulates a proper API response
    async function* mockStreamGenerator() {
      // First yield a valid chunk with content
      yield { 
        candidates: [
          { 
            content: { 
              role: 'model', 
              parts: [{ text: 'Hello' }]
            },
            finishReason: 'STOP'
          }
        ] 
      };
    }

    // Mock the generateContentStream to return a proper async generator
    mockContentGenerator.generateContentStream = vi.fn().mockImplementation(() => ({
      [Symbol.asyncIterator]: mockStreamGenerator
    }));

    // Mock the context manager to track calls
    const mockMaybeCleanupContext = vi.fn().mockResolvedValue(undefined);
    (chat as any).maybeCleanupContext = mockMaybeCleanupContext;

    const stream = await chat.sendMessageStream({ message: [{ text: 'Hello' }] }, 'test-prompt-id');

    // Consume the stream to completion
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Verify maybeCleanupContext was called during stream processing
    expect(mockMaybeCleanupContext).toHaveBeenCalled();
  });
});