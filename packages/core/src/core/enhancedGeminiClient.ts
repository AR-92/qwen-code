/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Content,
  GenerateContentConfig,
  GenerateContentResponse,
  Part,
  PartListUnion,
  Tool,
} from '@google/genai';
import type { Config } from '../config/config.js';
import { EnhancedGeminiChat } from './enhancedGeminiChat.js';
import { MagicalOrchestrator } from './magicalOrchestrator.js';
import { EnhancedContextManager } from './enhancedContextManager.js';
import type { AnyDeclarativeTool } from '../tools/tools.js';
import { GeminiClient } from './client.js';
import { AuthType, createContentGenerator } from './contentGenerator.js';
import type { ContentGenerator, ContentGeneratorConfig } from './contentGenerator.js';
import { DEFAULT_GEMINI_FLASH_MODEL } from '../config/models.js';
import { GeminiEventType, type ServerGeminiStreamEvent, type Turn } from './turn.js';
import { executeToolCall, type ToolCallRequestInfo } from '../tools/tools.js';
import { LoopDetectionService } from '../services/loopDetectionService.js';

/**
 * Enhanced Gemini Client that incorporates magical AI features
 * This replaces the base GeminiClient with enhanced orchestration
 */
export class EnhancedGeminiClient {
  private enhancedGeminiChat?: EnhancedGeminiChat;
  private enhancedOrchestrator?: MagicalOrchestrator;
  private enhancedContextManager?: EnhancedContextManager;
  private contentGenerator?: ContentGenerator;
  private config: Config;
  private history: Content[] = [];
  private generateContentConfig: GenerateContentConfig = {
    temperature: 0,
    topP: 1,
  };

  // Properties required to match GeminiClient interface
  private sessionTurnCount = 0;
  private lastPromptId: string;
  private readonly loopDetector: LoopDetectionService;
  private lastSentIdeContext: any;
  private forceFullIdeContext = true;
  private hasFailedCompressionAttempt = false;

  constructor(config: Config) {
    this.config = config;
    this.lastPromptId = config.getSessionId();
    this.loopDetector = new LoopDetectionService(config);
  }

  async initialize(
    contentGeneratorConfig: ContentGeneratorConfig,
    extraHistory?: Content[],
  ) {
    // Initialize the content generator
    this.contentGenerator = await createContentGenerator(
      contentGeneratorConfig,
      this.config,
      this.config.getSessionId(),
    );

    // Initialize the enhanced orchestration system
    const toolRegistry = this.config.getToolRegistry();
    const tools = toolRegistry.getAllTools() as AnyDeclarativeTool[];

    // Initialize the enhanced context manager
    this.enhancedContextManager = new EnhancedContextManager({
      cleanupThreshold: 0.8,
      maxKnowledgeEntries: 100,
      autoExtractKnowledge: true,
      model: this.config.getModel() || 'gemini-2.0-flash',
      fixedTokenThreshold: 4000,
      intentRecognitionEnabled: true,
      predictiveCleanupEnabled: true,
      knowledgeEnhancementEnabled: true,
      learningEnabled: true,
    });

    // Initialize the magical orchestrator
    this.enhancedOrchestrator = new MagicalOrchestrator(
      this.config,
      this.enhancedContextManager,
      this.contentGenerator,
      tools
    );

    // Initialize the enhanced chat system
    this.enhancedGeminiChat = new EnhancedGeminiChat(
      this.config,
      this.contentGenerator,
      tools
    );

    // Set initial history if provided
    if (extraHistory) {
      this.history = [...extraHistory];
    }
  }

  getContentGenerator(): ContentGenerator {
    if (!this.contentGenerator) {
      throw new Error('Content generator not initialized');
    }
    return this.contentGenerator;
  }

  isInitialized(): boolean {
    return this.contentGenerator !== undefined && 
           this.enhancedOrchestrator !== undefined &&
           this.enhancedGeminiChat !== undefined;
  }

  getHistory(): Content[] {
    return [...this.history];
  }

  setHistory(
    history: Content[],
    { stripThoughts = false }: { stripThoughts?: boolean } = {},
  ) {
    const historyToSet = stripThoughts
      ? history.map((content) => {
          const newContent = { ...content };
          if (newContent.parts) {
            newContent.parts = newContent.parts.map((part) => {
              if (
                part &&
                typeof part === 'object' &&
                'thoughtSignature' in part
              ) {
                const newPart = { ...part };
                delete (newPart as { thoughtSignature?: string })
                  .thoughtSignature;
                return newPart;
              }
              return part;
            });
          }
          return newContent;
        })
      : history;
    this.history = [...historyToSet];
    this.forceFullIdeContext = true;
  }

  async *sendMessageStream(
    request: PartListUnion,
    signal: AbortSignal,
    prompt_id: string,
    turns: number = 100, // MAX_TURNS from base class
    originalModel?: string,
  ): AsyncGenerator<ServerGeminiStreamEvent, Turn> {
    const isNewPrompt = this.lastPromptId !== prompt_id;
    if (isNewPrompt) {
      this.loopDetector.reset(prompt_id);
      this.lastPromptId = prompt_id;
    }
    this.sessionTurnCount++;
    if (
      this.config.getMaxSessionTurns() > 0 &&
      this.sessionTurnCount > this.config.getMaxSessionTurns()
    ) {
      yield { type: GeminiEventType.MaxSessionTurns };
      return new Turn(this as any, prompt_id); // Type assertion to satisfy interface
    }

    // Check if context needs cleanup before processing
    if (this.enhancedContextManager) {
      const currentHistory = this.getHistory();
      const shouldCleanup = await this.enhancedContextManager.shouldCleanupContext(currentHistory, this.config);
      if (shouldCleanup) {
        const { newHistory, knowledgeExtracted } = await this.enhancedContextManager.reduceContext(
          currentHistory,
          this.config,
          prompt_id
        );
        
        if (knowledgeExtracted.length > 0) {
          console.debug(`Enhanced context manager extracted ${knowledgeExtracted.length} knowledge items`);
        }
        
        // Set the reduced history
        this.setHistory(newHistory);
      }
    }

    // Use enhanced orchestration for complex tasks
    const shouldUseEnhancedOrchestration = this.shouldUseEnhancedOrchestration(request);

    if (shouldUseEnhancedOrchestration && this.enhancedOrchestrator) {
      // Convert PartListUnion to string for intent analysis
      const requestText = this.partListToString(request);
      
      // Use the enhanced orchestration system
      try {
        console.log(`✨ Using enhanced orchestration for: "${requestText.substring(0, 100)}..."`);
        
        // Process through enhanced orchestrator
        const enhancedResponse = await this.enhancedOrchestrator.process(requestText, this.getHistory());
        
        // Convert response to stream events
        if (enhancedResponse.length > 0 && enhancedResponse[0].parts) {
          const textContent = enhancedResponse[0].parts
            .map(part => (part as any).text || '')
            .filter(text => text)
            .join(' ');
          
          yield { type: GeminiEventType.Content, value: textContent };
        }
        
        // Handle any tool calls that might have been generated by the orchestration
        // In the enhanced system, these would have been handled internally
        return new Turn(this as any, prompt_id);
      } catch (error) {
        console.warn('Enhanced orchestration failed, falling back to standard approach:', error);
        // Fall back to the standard approach below
      }
    }

    // For now, fall back to standard processing if enhanced orchestration isn't appropriate or failed
    // In a complete implementation, this would call the underlying model directly
    console.warn('Standard processing not fully implemented in EnhancedGeminiClient, using fallback');
    return new Turn(this as any, prompt_id);
  }

  /**
   * Determine whether to use enhanced orchestration based on the request content
   */
  private shouldUseEnhancedOrchestration(request: PartListUnion): boolean {
    // Convert request to string to analyze
    const requestText = this.partListToString(request).toLowerCase();
    
    // Use enhanced orchestration for complex requests that involve:
    // - Multiple steps or complex reasoning
    // - Code refactoring or architectural changes
    // - Research tasks
    // - Debugging complex issues
    // - Any request that might benefit from context analysis
    
    const enhancedKeywords = [
      'refactor', 'debug', 'optimize', 'improve', 'research', 
      'analyze', 'investigate', 'understand', 'find all', 
      'multiple', 'complex', 'several', 'pattern', 'error',
      'fix', 'issue', 'problem', 'solution', 'strategy',
      'how to', 'best way', 'why does', 'what is', 'explain',
      'implement', 'add feature', 'add functionality', 'create',
      'performance', 'memory leak', 'slow', 'bottleneck',
      'security', 'vulnerability', 'secure', 'attack', 'safe',
      'architecture', 'design', 'structure', 'pattern',
      'compare', 'difference', 'between', 'pros and cons',
      'review', 'audit', 'check', 'verify', 'ensure',
      'integrate', 'connect', 'combine', 'merge', 'link',
      'upgrade', 'update', 'migrate', 'modernize',
      'test', 'testing', 'debugging', 'troubleshoot'
    ];
    
    // Check for multi-step instructions
    const multiStepIndicators = [
      'first', 'then', 'next', 'finally', 'after that', 'once you',
      'step by step', 'and then', 'followed by', 'after',
      '1.', '2.', '3.', 'one', 'two', 'three', 'four', 'five'
    ];
    
    // Count matches to determine complexity score
    let complexityScore = 0;
    enhancedKeywords.forEach(keyword => {
      if (requestText.includes(keyword)) {
        complexityScore += 1;
      }
    });
    
    multiStepIndicators.forEach(indicator => {
      if (requestText.includes(indicator)) {
        complexityScore += 1;
      }
    });
    
    // Also consider request length and complexity
    const wordCount = requestText.split(/\s+/).filter(word => word.length > 0).length;
    if (wordCount > 15) {
      complexityScore += 1;
    }
    
    // Increase score if request contains code-related terms
    const codeTerms = ['function', 'class', 'method', 'variable', 'module', 'package', 'dependency', 'library'];
    codeTerms.forEach(term => {
      if (requestText.includes(term)) {
        complexityScore += 1;
      }
    });
    
    // Use enhanced orchestration if complexity score is above threshold
    return complexityScore >= 2;
  }

  /**
   * Convert PartListUnion to string for analysis
   */
  private partListToString(request: PartListUnion): string {
    if (typeof request === 'string') {
      return request;
    }
    
    if (Array.isArray(request)) {
      return request
        .map(part => (part as any).text || (part as any).functionCall?.name || '')
        .join(' ');
    }
    
    return (request as any).text || '';
  }

  /**
   * Execute enhanced tool calls using the orchestration system
   */
  async executeEnhancedToolCall(
    requestInfo: ToolCallRequestInfo,
    signal: AbortSignal,
  ) {
    // If we have an orchestrator, use it for intelligent tool execution
    if (this.enhancedOrchestrator) {
      // In a real implementation, this would use the orchestrator's predictive execution
      // For now, fall back to standard execution
      return await executeToolCall(this.config, requestInfo, signal);
    } else {
      return await executeToolCall(this.config, requestInfo, signal);
    }
  }

  /**
   * Get execution plan prediction for the given request without executing
   */
  async predictExecutionPlan(userInput: string): Promise<any> {
    if (this.enhancedOrchestrator) {
      return await this.enhancedOrchestrator.predictExecution(userInput, this.getHistory());
    }
    return null;
  }
  
  // Additional methods to match GeminiClient interface for compatibility
  async addHistory(content: Content) {
    this.history.push(content);
  }
  
  async resetChat(): Promise<void> {
    this.history = [];
  }
  
  async reinitialize(): Promise<void> {
    // Reinitialize with current history preserved
    if (this.contentGenerator) {
      const contentGeneratorConfig = this.config.getContentGeneratorConfig();
      if (contentGeneratorConfig) {
        await this.initialize(contentGeneratorConfig, this.getHistory());
      }
    }
  }
}