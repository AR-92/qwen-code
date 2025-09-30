/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { 
  Content, 
  GenerateContentConfig, 
  GenerateContentResponse, 
  PartListUnion, 
  Tool 
} from '@google/genai';
import type { Config } from '../config/config.js';
import type { ContentGeneratorConfig } from './contentGenerator.js';
import type { ServerGeminiStreamEvent, Turn } from './turn.js';

/**
 * Interface that defines the contract for Qwen client implementations
 */
export interface IQwenClient {
  initialize(contentGeneratorConfig: ContentGeneratorConfig, extraHistory?: Content[]): Promise<void>;
  getContentGenerator(): any; // ContentGenerator type
  getUserTier(): any; // UserTierId | undefined
  addHistory(content: Content): Promise<void>;
  getChat(): any; // The actual chat interface
  isInitialized(): boolean;
  getHistory(): Content[];
  setHistory(history: Content[], options?: { stripThoughts?: boolean }): void;
  setTools(): Promise<void>;
  resetChat(): Promise<void>;
  reinitialize(): Promise<void>;
  addDirectoryContext(): Promise<void>;
  startChat(extraHistory?: Content[], model?: string): Promise<any>; // GeminiChat type
  sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
    turns?: number,
    originalModel?: string
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn>;
  generateJson(
    contents: Content[],
    schema: Record<string, unknown>,
    abortSignal: AbortSignal,
    model?: string,
    config?: GenerateContentConfig
  ): Promise<Record<string, unknown>>;
  generateContent(
    contents: Content[],
    generationConfig: GenerateContentConfig,
    abortSignal: AbortSignal,
    model?: string
  ): Promise<GenerateContentResponse>;
  generateEmbedding(texts: string[]): Promise<number[][]>;
  tryCompressChat(prompt_id: string, force?: boolean): Promise<any>; // ChatCompressionInfo type
}