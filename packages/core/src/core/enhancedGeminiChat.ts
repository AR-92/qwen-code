/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import { MagicalOrchestrator } from './magicalOrchestrator.js';
import { EnhancedContextManager } from './enhancedContextManager.js';
import type { AnyDeclarativeTool } from '../tools/tools.js';

/**
 * Enhanced GeminiChat that incorporates magical AI features
 * This replaces the standard GeminiChat with intelligent, predictive capabilities
 */
export class EnhancedGeminiChat {
  private orchestrator: MagicalOrchestrator;

  constructor(config: Config, contentGenerator: any, tools: AnyDeclarativeTool[]) {
    
    // Initialize the enhanced context manager
    const enhancedContextManager = new EnhancedContextManager({
      cleanupThreshold: 0.8,
      maxKnowledgeEntries: 100,
      autoExtractKnowledge: true,
      model: config.getModel() || 'gemini-2.0-flash',
      fixedTokenThreshold: 4000,
      intentRecognitionEnabled: true,
      predictiveCleanupEnabled: true,
      knowledgeEnhancementEnabled: true,
      learningEnabled: true,
    });
    
    // Initialize the magical orchestrator
    this.orchestrator = new MagicalOrchestrator(
      config,
      enhancedContextManager,
      contentGenerator,
      tools
    );
  }

  /**
   * Send a message through the enhanced, magical pipeline
   */
  async send(message: string, history: Content[]): Promise<Content[]> {
    console.log(`\n🚀 Qwen Code Magical Processing Initiated!`);
    
    // Initialize the orchestrator if needed
    await this.orchestrator.warmUp();
    
    // Process through the magical orchestrator
    return await this.orchestrator.process(message, history);
  }
  
  /**
   * Send a message to the model
   */
  async sendMessage(message: string, history: Content[]): Promise<Content[]> {
    console.log(`\n🚀 Qwen Code Magical Processing Initiated!`);
    
    // Initialize the orchestrator if needed
    await this.orchestrator.warmUp();
    
    // Process through the magical orchestrator
    return await this.orchestrator.process(message, history);
  }

  /**
   * Get a prediction of what would happen without executing
   */
  async predict(message: string, context: Content[]): Promise<any> {
    return await this.orchestrator.predictExecution(message, context);
  }

  /**
   * Initialize the chat system
   */
  async initialize(): Promise<void> {
    // Any initialization logic would go here
    console.log('✨ Enhanced GeminiChat initialized with magical capabilities');
  }
}