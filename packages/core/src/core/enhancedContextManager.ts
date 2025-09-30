/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import { ContextManager, type ExtractedKnowledge } from './contextManager.js';

// Represents predicted user intent
export interface UserIntent {
  id: string;
  type: 'code-change' | 'query' | 'debug' | 'refactor' | 'research' | 'other';
  targets?: string[]; // Files, functions, or concepts likely to be relevant
  expectedOutcome?: string;
  confidence: number;
}

// Represents value assessment for context items
export interface ContextValueAssessment {
  contentId: string;
  relevanceScore: number;
  importanceScore: number;
  predictedReuse: boolean;
  semanticLinks: string[]; // IDs of semantically related content
}

// Configuration for enhanced context management
interface EnhancedContextManagerConfig {
  // Base configuration from ContextManager
  cleanupThreshold: number;
  maxKnowledgeEntries: number;
  autoExtractKnowledge: boolean;
  model: string;
  fixedTokenThreshold?: number;
  
  // Enhanced features configuration
  intentRecognitionEnabled: boolean;
  predictiveCleanupEnabled: boolean;
  knowledgeEnhancementEnabled: boolean;
  learningEnabled: boolean;
}

/**
 * Advanced Context Manager with AI-powered intelligence and predictive capabilities
 */
export class EnhancedContextManager extends ContextManager {
  private intentRecognitionEnabled: boolean;
  private predictiveCleanupEnabled: boolean;
  private knowledgeEnhancementEnabled: boolean;
  private learningEnabled: boolean;
  
  private interactionHistory: Array<{
    userInput: string;
    contextState: Content[];
    actionTaken: 'kept' | 'removed' | 'compressed';
    effectiveness: number; // 0-1 rating of how well this decision helped
  }> = [];

  constructor(config?: Partial<EnhancedContextManagerConfig>) {
    super(config);
    const defaultEnhancedConfig: EnhancedContextManagerConfig = {
      cleanupThreshold: 0.8,
      maxKnowledgeEntries: 100,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
      fixedTokenThreshold: 4000,
      intentRecognitionEnabled: true,
      predictiveCleanupEnabled: true,
      knowledgeEnhancementEnabled: true,
      learningEnabled: true,
    };

    const finalConfig = { ...defaultEnhancedConfig, ...config };
    this.intentRecognitionEnabled = finalConfig.intentRecognitionEnabled ?? defaultEnhancedConfig.intentRecognitionEnabled;
    this.predictiveCleanupEnabled = finalConfig.predictiveCleanupEnabled ?? defaultEnhancedConfig.predictiveCleanupEnabled;
    this.knowledgeEnhancementEnabled = finalConfig.knowledgeEnhancementEnabled ?? defaultEnhancedConfig.knowledgeEnhancementEnabled;
    this.learningEnabled = finalConfig.learningEnabled ?? defaultEnhancedConfig.learningEnabled;
  }

  /**
   * Magically predict user intent from their input
   */
  async predictUserIntent(userInput: string, context: Content[]): Promise<UserIntent> {
    if (!this.intentRecognitionEnabled) {
      // Fallback to simple classification
      return {
        id: `intent-${Date.now()}`,
        type: this.classifyIntent(userInput),
        confidence: 0.5,
      };
    }

    // Advanced intent recognition logic would go here
    // This could involve LLM calls to understand user intent
    const intentType = this.classifyIntent(userInput);
    const confidence = this.estimateIntentConfidence(userInput, context);
    
    // For now, return a basic intent with enhanced confidence
    return {
      id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: intentType,
      confidence,
      targets: this.extractPotentialTargets(userInput, context)
    };
  }

  /**
   * Prepare context for upcoming tasks based on predicted intent
   */
  async prepareContextForTask(userInput: string, currentHistory: Content[]): Promise<Content[]> {
    if (!this.intentRecognitionEnabled) {
      return currentHistory;
    }

    const intent = await this.predictUserIntent(userInput, currentHistory);
    
    // Identify which parts of current context are most relevant to the intent
    const relevantContext = await this.identifyRelevantContext(currentHistory, intent);
    
    // If knowledge enhancement is enabled, add relevant knowledge
    if (this.knowledgeEnhancementEnabled) {
      const enhancedContext = await this.addRelevantKnowledge(relevantContext, intent);
      return enhancedContext;
    }

    return relevantContext;
  }

  /**
   * Predict if cleanup will be needed in near future
   */
  async predictCleanupNeed(
    history: Content[],
    config?: Config,
  ): Promise<boolean> {
    if (!this.predictiveCleanupEnabled) {
      return super.shouldCleanupContext(history, config);
    }

    // Estimate future token usage based on current pattern
    const projectedUsage = await this.projectFutureTokenUsage(history, config);
    
    // Check if we'll exceed threshold in next few interactions
    return projectedUsage > (this.getFixedTokenThreshold() ? 0.9 : 0.8); // Use default threshold comparison
  }

  /**
   * Enhanced context reduction with predictive capabilities
   */
  override async reduceContext(
    history: Content[],
    config?: Config,
    jobId?: string,
  ): Promise<{ newHistory: Content[], knowledgeExtracted: ExtractedKnowledge[] }> {
    // First, extract knowledge as before
    const knowledgeExtracted = await this.extractKnowledgeFromConversation(history, jobId);

    // Apply intelligent filtering
    const newHistory = await this.intelligentFilterContext(history);

    // Learn from this interaction if enabled
    if (this.learningEnabled) {
      await this.learnFromReduction(history, newHistory);
    }

    return { newHistory, knowledgeExtracted };
  }

  /**
   * Assess the value of different context items for intelligent filtering
   */
  private async assessContextValue(history: Content[]): Promise<Map<string, ContextValueAssessment>> {
    const assessments = new Map<string, ContextValueAssessment>();
    
    for (let i = 0; i < history.length; i++) {
      const content = history[i];
      const contentId = `content-${i}-${Date.now()}`;
      
      // Calculate relevance and importance scores
      const relevanceScore = await this.calculateRelevanceScore(content, history);
      const importanceScore = await this.calculateImportanceScore(content);
      
      assessments.set(contentId, {
        contentId,
        relevanceScore,
        importanceScore,
        predictedReuse: relevanceScore > 0.7 || importanceScore > 0.7,
        semanticLinks: [] // Would be populated by semantic analysis
      });
    }
    
    return assessments;
  }

  /**
   * Apply intelligent filtering based on value assessment
   */
  private async intelligentFilterContext(history: Content[]): Promise<Content[]> {
    const assessments = await this.assessContextValue(history);
    const minRelevance = 0.3;
    const minImportance = 0.4;
    
    const filtered: Content[] = [];
    
    for (let i = 0; i < history.length; i++) {
      const content = history[i];
      const assessment = Array.from(assessments.values())[i];
      
      if (!assessment) continue;
      
      // Keep if it meets relevance OR importance thresholds
      if (assessment.relevanceScore >= minRelevance || assessment.importanceScore >= minImportance) {
        filtered.push(content);
      }
    }
    
    return filtered;
  }

  /**
   * Calculate how relevant a content piece is to the conversation
   */
  private async calculateRelevanceScore(content: Content, fullHistory: Content[]): Promise<number> {
    // Simple heuristic: user and model responses are more relevant than tool responses
    if (content.role === 'user' || content.role === 'model') {
      return 0.9; // High relevance
    }
    
    // Check if content contains important information (code, decisions, etc.)
    if (content.parts) {
      for (const part of content.parts) {
        if (part.text) {
          // Look for code blocks, decisions, or important keywords
          if (part.text.includes('```') || 
              /decision|conclusion|result|outcome|important|critical/i.test(part.text)) {
            return 0.8; // High relevance
          }
          
          // Technical content is more relevant
          if (/(function|class|method|variable|error|bug|fix|implement)/i.test(part.text)) {
            return 0.7; // Medium-high relevance
          }
        }
      }
    }
    
    // Tool responses are generally less relevant
    return 0.3;
  }

  /**
   * Calculate how important a content piece is regardless of relevance
   */
  private calculateImportanceScore(content: Content): number {
    if (content.role === 'model' && content.parts) {
      // Model responses with code or decisions are very important
      for (const part of content.parts) {
        if (part.text) {
          if (part.text.includes('```')) return 0.9; // Code is important
          if (part.text.includes('```typescript') || 
              part.text.includes('```javascript') ||
              part.text.includes('```python')) return 0.9;
          if (/(suggestion|recommendation|note|warning|important)/i.test(part.text)) return 0.8;
        }
      }
    }
    
    return 0.5; // Default importance
  }

  /**
   * Classify intent based on simple heuristics
   */
  private classifyIntent(userInput: string): UserIntent['type'] {
    const lowerInput = userInput.toLowerCase();
    
    // Check for debug-related terms first, as "fix" could apply to debugging
    if (/(debug|fix|error|bug|problem|issue|trace|solve)/i.test(lowerInput)) {
      return 'debug';
    } else if (/(change|modify|update|edit|implement|add|create|write)/i.test(lowerInput)) {
      return 'code-change';
    } else if (/(what|how|why|explain|describe|understand|find|search|query)/i.test(lowerInput)) {
      return 'query';
    } else if (/(refactor|restructure|improve|optimize|clean|simplify)/i.test(lowerInput)) {
      return 'refactor';
    } else if (/(research|study|learn|investigate|explore)/i.test(lowerInput)) {
      return 'research';
    } else {
      return 'other';
    }
  }

  /**
   * Estimate confidence in intent classification
   */
  private estimateIntentConfidence(userInput: string, context: Content[]): number {
    // More specific keywords = higher confidence
    const keywordMatches = [
      { pattern: /(change|modify|update)/i, weight: 0.9 },
      { pattern: /(debug|fix|error|bug)/i, weight: 0.9 },
      { pattern: /refactor/i, weight: 0.85 },
      { pattern: /(what is|how do|why does)/i, weight: 0.8 },
      { pattern: /(implement|write|create)/i, weight: 0.85 },
    ];
    
    let maxWeight = 0;
    for (const match of keywordMatches) {
      if (match.pattern.test(userInput)) {
        maxWeight = Math.max(maxWeight, match.weight);
      }
    }
    
    // If no specific keywords, return lower confidence
    return maxWeight > 0 ? maxWeight : 0.6;
  }

  /**
   * Extract potential targets from user input
   */
  private extractPotentialTargets(userInput: string, context: Content[]): string[] {
    const targets: string[] = [];
    
    // Extract technical keywords and concepts from user input
    // Look for specific terms related to authentication, login, etc.
    const authRelatedTerms = userInput.toLowerCase().match(/(auth|authentication|login|user|service|function|module|api|endpoint)/gi);
    if (authRelatedTerms) {
      targets.push(...authRelatedTerms.filter((term, index, arr) => arr.indexOf(term) === index));
    }
    
    // Look for file patterns in user input
    const filePattern = /(?:\s|^)([a-zA-Z0-9_\-./]+(?:\.[a-zA-Z]{1,6})+)(?:\s|$)/g;
    let match;
    while ((match = filePattern.exec(userInput)) !== null) {
      if (match[1].length > 1) { // Avoid single character matches
        targets.push(match[1]);
      }
    }
    
    // Look for common function/class patterns
    const codePattern = /(?:function|class|method)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gi;
    while ((match = codePattern.exec(userInput)) !== null) {
      targets.push(match[1]);
    }
    
    return Array.from(new Set(targets)); // Remove duplicates
  }

  /**
   * Identify which context items are most relevant to a given intent
   */
  private async identifyRelevantContext(history: Content[], intent: UserIntent): Promise<Content[]> {
    // For now, return context that matches the intent type
    // In a real implementation, this would use more sophisticated analysis
    return history.filter(content => {
      if (content.role === 'user' || content.role === 'model') {
        return true; // User and model interactions are always relevant
      }
      
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // For code-change intents, keep code-related tool responses
            if (intent.type === 'code-change' && /read|edit|create|file/i.test(part.text)) {
              return true;
            }
            // For query intents, keep search results
            if (intent.type === 'query' && /search|found|result/i.test(part.text)) {
              return true;
            }
          }
        }
      }
      
      return false;
    });
  }

  /**
   * Add relevant knowledge to context based on intent
   */
  private async addRelevantKnowledge(context: Content[], intent: UserIntent): Promise<Content[]> {
    if (!this.knowledgeEnhancementEnabled) {
      return context;
    }
    
    const enhancedContext = [...context];
    
    // Create a combined list of tags to search for relevant knowledge
    const searchTags: string[] = [intent.type];
    if (intent.targets) {
      searchTags.push(...intent.targets);
    }
    
    // Add some related tags for broader knowledge retrieval
    if (intent.type === 'debug') {
      searchTags.push('error', 'bug', 'issue');
    } else if (intent.type === 'query') {
      searchTags.push('information', 'search');
    } else if (intent.type === 'code-change') {
      searchTags.push('implementation', 'function', 'feature');
    } else if (intent.type === 'refactor') {
      searchTags.push('improvement', 'optimization');
    } else if (intent.type === 'research') {
      searchTags.push('study', 'investigation');
    } else {
      searchTags.push('general');
    }
    
    // Add relevant knowledge based on intent and targets
    const relevantKnowledge = this.getKnowledgeByTags(searchTags);
    
    if (relevantKnowledge.length > 0) {
      // Create content from relevant knowledge
      const knowledgeContent: Content = {
        role: 'model',
        parts: [{
          text: `Relevant knowledge for your request:\n\n${relevantKnowledge.map(k => `- ${k.content}`).join('\n')}`
        }]
      };
      
      enhancedContext.push(knowledgeContent);
    }
    
    return enhancedContext;
  }

  /**
   * Learn from context reduction decisions
   */
  private async learnFromReduction(original: Content[], reduced: Content[]): Promise<void> {
    // For now, this would store the reduction decision to improve future filtering
    // In a real implementation, this would train a model based on effectiveness feedback
    if (this.learningEnabled) {
      this.interactionHistory.push({
        userInput: "context_reduction",
        contextState: original,
        actionTaken: 'compressed',
        effectiveness: 0.7 // Default effectiveness rating
      });
    }
  }

  /**
   * Project future token usage based on current patterns
   */
  private async projectFutureTokenUsage(history: Content[], config?: Config): Promise<number> {
    const currentUsage = await this.getContextUsage(history, config);
    
    // Simple projection: assume next few interactions will be similar size
    // In reality, this would use more sophisticated ML models
    return currentUsage.percentageUsed * 1.2; // Project 20% growth
  }
}