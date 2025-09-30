/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import { EnhancedContextManager } from './enhancedContextManager.js';
import { IntentRecognitionEngine } from './intentRecognitionEngine.js';
import { SmartToolSelector } from './smartToolSelector.js';
import { PredictiveExecutionEngine, type ExecutionPlan } from './predictiveExecutionEngine.js';
import { GeminiChat } from './geminiChat.js';
import type { Config } from '../config/config.js';
import type { AnyDeclarativeTool } from '../tools/tools.js';

/**
 * Magical Orchestrator - The "Brain" of Qwen Code
 * Brings together all advanced AI features for magical user experience
 */
export class MagicalOrchestrator {
  private contextManager: EnhancedContextManager;
  private intentEngine: IntentRecognitionEngine;
  private toolSelector: SmartToolSelector;
  private executionEngine: PredictiveExecutionEngine;
  private geminiChat: GeminiChat;
  
  constructor(
    config: Config,
    contextManager: EnhancedContextManager,
    contentGenerator: any, // Using 'any' temporarily since this is an external interface
    tools: AnyDeclarativeTool[]
  ) {
    this.contextManager = contextManager;
    this.intentEngine = new IntentRecognitionEngine();
    this.toolSelector = new SmartToolSelector();
    this.executionEngine = new PredictiveExecutionEngine(contextManager);
    this.geminiChat = new GeminiChat(config, contentGenerator);
    
    // Register all tools with the smart selector
    tools.forEach(tool => this.toolSelector.registerTool(tool));
  }
  
  /**
   * The magical method - Process user input with AI-powered intelligence
   */
  async magicalProcess(userInput: string, history: Content[]): Promise<Content[]> {
    console.log(`✨ Initiating magical processing for: "${userInput}"`);
    
    // Step 1: Predict user intent with advanced AI
    const intent = await this.intentEngine.predictIntent(userInput, history);
    console.log(`🎯 Predicted intent: ${intent.type} (confidence: ${(intent.confidence * 100).toFixed(1)}%)`);
    
    // Step 2: Prepare context based on predicted intent
    const enhancedHistory = await this.contextManager.prepareContextForTask(userInput, history);
    
    // Step 3: Predict optimal execution plan
    const executionPlan = await this.executionEngine.predictExecutionPlan(userInput, enhancedHistory);
    console.log(`🔮 Predicted execution plan with ${(executionPlan.executionSteps.length)} steps`);
    
    // Step 4: Execute with prediction if confidence is high enough
    let executionResults: any[] = [];
    if (executionPlan.confidence > 0.6) { // Only execute if we're reasonably confident
      console.log(`🚀 Executing with ${(executionPlan.confidence * 100).toFixed(1)}% confidence`);
      executionResults = await this.executionEngine.executeWithPrediction(
        userInput, 
        enhancedHistory,
        (step, result) => {
          console.log(`✅ Completed step: ${step.tool.constructor.name}`);
        }
      );
    }
    
    // Step 5: Prepare final context combining execution results
    const finalHistory = [...enhancedHistory];
    
    // Add execution results to context if any
    if (executionResults.length > 0) {
      for (const result of executionResults) {
        finalHistory.push({
          role: 'model',
          parts: [{ text: `Execution result: ${JSON.stringify(result, null, 2)}` }]
        });
      }
    }
    
    // Step 6: Generate AI response using the enhanced context
    const chatResponse = await this.geminiChat.sendMessage({ message: userInput }, 'magical-processing');
    
    // Convert the response to the format expected by the history
    const response: Content[] = [{
      role: 'model',
      parts: chatResponse.candidates?.[0]?.content?.parts || [{ text: 'No content in response' }]
    }];
    
    console.log(`✨ Magical processing complete!`);
    
    // Step 7: Reduce context if needed to maintain efficiency
    const { newHistory } = await this.contextManager.reduceContext(response, undefined, 'magical-processing');
    
    return newHistory;
  }
  
  /**
   * Process with predictive context management
   */
  async process(userInput: string, history: Content[]): Promise<Content[]> {
    // Check if predictive cleanup is needed
    const shouldCleanup = await this.contextManager.predictCleanupNeed(history);
    
    if (shouldCleanup) {
      console.log(`🧹 Performing predictive cleanup before processing`);
      const { newHistory } = await this.contextManager.reduceContext(history);
      return this.magicalProcess(userInput, newHistory);
    }
    
    // Otherwise proceed with normal magical processing
    return this.magicalProcess(userInput, history);
  }
  
  /**
   * Get execution plan prediction without executing
   */
  async predictExecution(userInput: string, context: Content[]): Promise<ExecutionPlan> {
    return this.executionEngine.predictExecutionPlan(userInput, context);
  }
  
  /**
   * Warm up the orchestrator with common patterns
   */
  async warmUp(): Promise<void> {
    console.log(`🌟 Warming up magical orchestrator...`);
    // In a real implementation, this would pre-load models and prepare caches
    console.log(`✨ Magical orchestrator ready!`);
  }
}