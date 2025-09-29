/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import { tokenLimit } from './tokenLimits.js';
import type { Config } from '../config/config.js';

// Represents extracted knowledge from a conversation
interface ExtractedKnowledge {
  id: string;
  content: string;
  timestamp: number;
  tags: string[];
  source?: string;
}

// Represents context usage statistics
interface ContextUsage {
  tokensUsed: number;
  tokensLimit: number;
  percentageUsed: number;
}

// Configuration for context management
interface ContextManagerConfig {
  // Percentage threshold at which to trigger cleanup (0.0 to 1.0)
  cleanupThreshold: number;
  // Maximum number of extracted knowledge entries to retain
  maxKnowledgeEntries: number;
  // Whether to automatically extract knowledge during cleanup
  autoExtractKnowledge: boolean;
  // Model name to use for token counting
  model: string;
}

/**
 * Manages context length by tracking usage, extracting knowledge,
 * and cleaning up unnecessary context after completing jobs.
 */
export class ContextManager {
  private knowledgeBase: ExtractedKnowledge[] = [];
  private maxKnowledgeEntries: number;
  private cleanupThreshold: number;
  private autoExtractKnowledge: boolean;
  private model: string;

  constructor(config?: Partial<ContextManagerConfig>) {
    const defaultConfig: ContextManagerConfig = {
      cleanupThreshold: 0.8, // 80% threshold
      maxKnowledgeEntries: 100,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
    };

    const finalConfig = { ...defaultConfig, ...config };
    this.cleanupThreshold = finalConfig.cleanupThreshold;
    this.maxKnowledgeEntries = finalConfig.maxKnowledgeEntries;
    this.autoExtractKnowledge = finalConfig.autoExtractKnowledge;
    this.model = finalConfig.model;
  }

  /**
   * Check if current context usage exceeds the cleanup threshold
   */
  async shouldCleanupContext(
    history: Content[],
    config?: Config,
  ): Promise<boolean> {
    const usage = await this.getContextUsage(history, config);
    return usage.percentageUsed >= this.cleanupThreshold;
  }

  /**
   * Calculate context usage statistics
   */
  async getContextUsage(
    history: Content[],
    config?: Config,
  ): Promise<ContextUsage> {
    // Use provided model or default
    const model = config?.getModel() || this.model;
    const limit = tokenLimit(model, 'input');

    // For now, we'll use a simple estimation approach
    // In a real implementation, we'd call the countTokens API
    const tokensUsed = this.estimateTokenCount(history);
    const percentageUsed = tokensUsed / limit;

    return {
      tokensUsed,
      tokensLimit: limit,
      percentageUsed,
    };
  }

  /**
   * Estimate token count from content history
   * This is a simplified estimation - in practice you'd use the actual countTokens API
   */
  private estimateTokenCount(history: Content[]): number {
    let totalTokens = 0;

    for (const content of history) {
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Rough estimation: ~4 characters per token
            totalTokens += Math.ceil(part.text.length / 4);
          }
          // Add estimates for other part types if needed
        }
      }
    }

    return totalTokens;
  }

  /**
   * Extract knowledge from completed conversation
   */
  async extractKnowledgeFromConversation(
    history: Content[],
    jobId?: string,
  ): Promise<ExtractedKnowledge[]> {
    if (!this.autoExtractKnowledge) {
      return [];
    }

    const knowledge: ExtractedKnowledge[] = [];
    const timestamp = Date.now();

    // Extract important information from the conversation
    for (const content of history) {
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Look for important knowledge patterns
            const extracted = this.extractKnowledgeFromText(part.text, timestamp, jobId);
            knowledge.push(...extracted);
          }
        }
      }
    }

    // Save extracted knowledge
    this.knowledgeBase.push(...knowledge);

    // Maintain size limits
    if (this.knowledgeBase.length > this.maxKnowledgeEntries) {
      // Keep the most recent entries
      this.knowledgeBase = this.knowledgeBase.slice(-this.maxKnowledgeEntries);
    }

    return knowledge;
  }

  /**
   * Extract knowledge from text content
   */
  private extractKnowledgeFromText(
    text: string,
    timestamp: number,
    jobId?: string,
  ): ExtractedKnowledge[] {
    const knowledge: ExtractedKnowledge[] = [];
    
    // Extract important patterns like definitions, decisions, or factual statements
    const patterns = [
      // Look for important statements like definitions
      {
        regex: /(Note that|Important:|Remember that|Remember:)\s+([^.!?]+[.!?])/gi,
        tag: 'important-note'
      },
      // Look for decisions or conclusions
      {
        regex: /(Decision:|Conclusion:|Result:|Outcome:)\s*([^.!?]+[.!?])/gi,
        tag: 'decision'
      },
      // Look for facts or knowledge statements
      {
        regex: /(Fact:|Knowledge:)\s*([^.!?]+[.!?])/gi,
        tag: 'fact'
      },
      // Look for user preferences or requirements
      {
        regex: /((?:I )?(?:prefer|want|need|require|must|should))\s+([^.,;]+)/gi,
        tag: 'preference'
      }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        knowledge.push({
          id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: match[0].trim(),
          timestamp,
          tags: [pattern.tag, ...(jobId ? [jobId] : [])],
          source: jobId
        });
      }
    }

    // If no specific patterns matched, consider significant text blocks as potential knowledge
    if (knowledge.length === 0 && text.length > 50) {
      // Extract longer, significant text blocks
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
      for (const sentence of sentences) {
        if (sentence.trim().length > 50) { // Only extract meaningful chunks
          knowledge.push({
            id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: sentence.trim(),
            timestamp,
            tags: ['general', ...(jobId ? [jobId] : [])],
            source: jobId
          });
        }
      }
    }

    return knowledge;
  }

  /**
   * Reduce context by filtering out less important parts while keeping essential information
   */
  async reduceContext(
    history: Content[],
    config?: Config,
    jobId?: string,
  ): Promise<{ newHistory: Content[], knowledgeExtracted: ExtractedKnowledge[] }> {
    // First, extract knowledge from the conversation
    const knowledgeExtracted = await this.extractKnowledgeFromConversation(history, jobId);

    // Then reduce the context by removing less important parts
    const newHistory = this.filterContext(history);

    return { newHistory, knowledgeExtracted };
  }

  /**
   * Filter context to retain only the most important parts
   */
  private filterContext(history: Content[]): Content[] {
    // In this simplified implementation, we'll keep model responses and
    // only the most recent user inputs, removing intermediate tool responses
    // that might be less essential for future context

    const filtered: Content[] = [];
    
    for (let i = 0; i < history.length; i++) {
      const content = history[i];
      
      if (content.role === 'model') {
        // Always keep model responses as they contain important decisions/answers
        filtered.push(content);
      } else if (content.role === 'user') {
        // Always keep user inputs
        filtered.push(content);
      } else {
        // For other roles (like tool responses), we might want to filter
        // In this implementation, we keep everything but in a real scenario
        // we might apply more sophisticated filtering based on content type
        filtered.push(content);
      }
    }

    return filtered;
  }

  /**
   * Get stored knowledge that matches the given tags
   */
  getKnowledgeByTags(tags: string[]): ExtractedKnowledge[] {
    return this.knowledgeBase.filter(k => 
      tags.some(tag => k.tags.includes(tag))
    );
  }

  /**
   * Get all stored knowledge
   */
  getAllKnowledge(): ExtractedKnowledge[] {
    return [...this.knowledgeBase];
  }

  /**
   * Clear the knowledge base
   */
  clearKnowledge(): void {
    this.knowledgeBase = [];
  }

  /**
   * Add knowledge manually
   */
  addKnowledge(knowledge: ExtractedKnowledge): void {
    this.knowledgeBase.push(knowledge);

    // Maintain size limits
    if (this.knowledgeBase.length > this.maxKnowledgeEntries) {
      // Keep the most recent entries
      this.knowledgeBase = this.knowledgeBase.slice(-this.maxKnowledgeEntries);
    }
  }

  /**
   * Update cleanup threshold
   */
  setCleanupThreshold(threshold: number): void {
    this.cleanupThreshold = threshold;
  }
}