/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import { ContextManager, type ExtractedKnowledge } from './contextManager.js';

/**
 * Configuration for aggressive context management
 */
interface AggressiveContextManagerConfig {
  // Percentage threshold at which to trigger cleanup (0.0 to 1.0)
  cleanupThreshold: number;
  // Maximum number of extracted knowledge entries to retain
  maxKnowledgeEntries: number;
  // Whether to automatically extract knowledge during cleanup
  autoExtractKnowledge: boolean;
  // Model name to use for token counting
  model: string;
  // Fixed token threshold to trigger cleanup (alternative to percentage-based)
  fixedTokenThreshold?: number;
  // Whether to aggressively filter tool responses
  aggressiveToolResponseFiltering?: boolean;
  // Whether to compress text content
  enableTextCompression?: boolean;
  // Minimum length of content to preserve during compression
  minContentLength?: number;
  // Whether to remove redundant content
  removeRedundantContent?: boolean;
  // Whether to summarize long content blocks
  enableSummarization?: boolean;
}

/**
 * Enhanced ContextManager with more aggressive context reduction strategies
 */
export class AggressiveContextManager extends ContextManager {
  private aggressiveToolResponseFiltering: boolean;
  private enableTextCompression: boolean;
  private minContentLength: number;
  private removeRedundantContent: boolean;
  private enableSummarization: boolean;

  constructor(config?: Partial<AggressiveContextManagerConfig>) {
    // Extract aggressive-specific config options
    const aggresiveConfig = {
      aggressiveToolResponseFiltering: true,
      enableTextCompression: true,
      minContentLength: 20, // Minimum content length to preserve
      removeRedundantContent: true,
      enableSummarization: true,
      ...config
    };

    // Call parent constructor with non-aggressive options
    super({
      cleanupThreshold: aggresiveConfig.cleanupThreshold,
      maxKnowledgeEntries: aggresiveConfig.maxKnowledgeEntries,
      autoExtractKnowledge: aggresiveConfig.autoExtractKnowledge,
      model: aggresiveConfig.model,
      fixedTokenThreshold: aggresiveConfig.fixedTokenThreshold,
    });

    this.aggressiveToolResponseFiltering = aggresiveConfig.aggressiveToolResponseFiltering ?? true;
    this.enableTextCompression = aggresiveConfig.enableTextCompression ?? true;
    this.minContentLength = aggresiveConfig.minContentLength ?? 20;
    this.removeRedundantContent = aggresiveConfig.removeRedundantContent ?? true;
    this.enableSummarization = aggresiveConfig.enableSummarization ?? true;
  }

  /**
   * More aggressive context filtering that removes more content while preserving essential information
   */
  protected override filterContext(history: Content[]): Content[] {
    let filtered: Content[] = [...history];

    // Apply multiple aggressive filtering strategies
    if (this.aggressiveToolResponseFiltering) {
      filtered = this.aggressiveToolResponseFilter(filtered);
    }

    if (this.removeRedundantContent) {
      filtered = this.removeRedundantContentFromHistory(filtered);
    }

    if (this.enableTextCompression) {
      filtered = this.compressTextInHistory(filtered);
    }

    if (this.enableSummarization) {
      filtered = this.summarizeLongContent(filtered);
    }

    // Ensure we preserve essential conversation structure
    return this.ensureEssentialContent(filtered);
  }

  /**
   * Aggressively filter tool responses by removing verbose output
   */
  private aggressiveToolResponseFilter(history: Content[]): Content[] {
    return history.filter(content => {
      // Always keep user and model roles
      if (content.role === 'user' || content.role === 'model') {
        return true;
      }

      // For other roles, apply more aggressive filtering
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Remove very verbose tool responses that don't contain essential info
            if (part.text.length > 1000) {
              // Check if it's an error or contains essential information
              const isEssential = 
                part.text.toLowerCase().includes('error') || 
                part.text.toLowerCase().includes('fail') || 
                part.text.toLowerCase().includes('success') ||
                this.containsEssentialKeywords(part.text);
              
              // Only keep if it's essential or has important information
              if (!isEssential) {
                return false;
              }
            }
          }
        }
      }

      // Keep the content if it passes our checks
      return true;
    });
  }

  /**
   * Remove redundant or duplicate content from history
   */
  private removeRedundantContentFromHistory(history: Content[]): Content[] {
    const seenContent = new Set<string>();
    const uniqueHistory: Content[] = [];

    for (const content of history) {
      if (content.parts) {
        const newTextParts: { text?: string }[] = [];
        
        for (const part of content.parts) {
          if (part.text) {
            const normalizedText = this.normalizeText(part.text);
            // Only add if we haven't seen this content before
            if (!seenContent.has(normalizedText)) {
              seenContent.add(normalizedText);
              newTextParts.push(part);
            }
          } else {
            // Add non-text parts as-is
            newTextParts.push(part);
          }
        }

        if (newTextParts.length > 0) {
          uniqueHistory.push({
            ...content,
            parts: newTextParts
          });
        }
      } else {
        // Add content without parts as-is
        uniqueHistory.push(content);
      }
    }

    return uniqueHistory;
  }

  /**
   * Compress text content to reduce token usage
   */
  private compressTextInHistory(history: Content[]): Content[] {
    return history.map(content => {
      if (content.parts) {
        const newParts = content.parts.map(part => {
          if (part.text && part.text.length > this.minContentLength) {
            // Extract essential information, remove verbose parts
            return {
              ...part,
              text: this.extractEssentialText(part.text)
            };
          }
          return part;
        });

        return {
          ...content,
          parts: newParts
        };
      }
      return content;
    });
  }

  /**
   * Summarize long content blocks to reduce tokens
   */
  private summarizeLongContent(history: Content[]): Content[] {
    return history.map(content => {
      if (content.parts) {
        const newParts = content.parts.map(part => {
          if (part.text && part.text.length > 2000) { // Only summarize if longer than 2000 chars
            // Create a brief summary of the long content
            const summary = this.createTextSummary(part.text);
            return {
              ...part,
              text: `Summary: ${summary}\n\nFull context preserved in knowledge base.`
            };
          }
          return part;
        });

        return {
          ...content,
          parts: newParts
        };
      }
      return content;
    });
  }

  /**
   * Extract essential text by focusing on key information
   */
  private extractEssentialText(text: string): string {
    // Look for essential patterns to preserve
    const essentialPatterns = [
      /Important:[^.!]*[!.]/gi,
      /Critical:[^.!]*[!.]/gi,
      /Note:[^.!]*[!.]/gi,
      /Warning:[^.!]*[!.]/gi,
      /Remember:[^.!]*[!.]/gi,
      /Key point:[^.!]*[!.]/gi,
      /Decision:.*?(?=[.!?]|$)/gi,
      /Result:.*?(?=[.!?]|$)/gi,
      /Outcome:.*?(?=[.!?]|$)/gi,
    ];

    const essentialLines: string[] = [];

    // Extract essential patterns
    for (const pattern of essentialPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        essentialLines.push(match[0].trim());
      }
    }

    // If we found essential content, return it; otherwise return beginning and end
    if (essentialLines.length > 0) {
      return essentialLines.slice(0, 5).join(' ') + (essentialLines.length > 5 ? '...' : '');
    }

    // If no essential patterns found, preserve first and last parts
    if (text.length > this.minContentLength * 2) {
      const start = text.substring(0, this.minContentLength);
      const end = text.substring(text.length - this.minContentLength);
      return `${start}...[content shortened]...${end}`;
    }

    return text;
  }

  /**
   * Create a summary of long text content
   */
  private createTextSummary(text: string): string {
    // Simple approach: extract first few sentences and key points
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length <= 3) {
      return text.substring(0, 100) + (text.length > 100 ? '...' : '');
    }

    // Take first and last few sentences as summary
    const summaryParts = [
      sentences[0]?.substring(0, 50),
      sentences.length > 3 ? '...' : '',
      sentences[sentences.length - 1]?.substring(0, 50)
    ].filter(Boolean);

    return summaryParts.join(' ') + '...';
  }

  /**
   * Check if text contains essential keywords that should be preserved
   */
  private containsEssentialKeywords(text: string): boolean {
    const essentialKeywords = [
      'error', 'fail', 'success', 'done', 'complete', 'finished',
      'warning', 'critical', 'important', 'note', 'remember',
      'decision', 'result', 'outcome', 'change', 'update', 'fix'
    ];

    const lowerText = text.toLowerCase();
    return essentialKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Normalize text for duplicate detection
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .trim();
  }

  /**
   * Ensure essential content is preserved even after aggressive filtering
   */
  private ensureEssentialContent(history: Content[]): Content[] {
    // Always preserve the most recent user query and the model's response to it
    const result = [...history];
    
    // Find the last user query
    let lastUserIndex = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        lastUserIndex = i;
        break;
      }
    }
    
    // If we removed the last model response to a user query, add it back
    if (lastUserIndex >= 0 && lastUserIndex < history.length - 1) {
      const correspondingModelIndex = lastUserIndex + 1;
      if (correspondingModelIndex < history.length && 
          history[correspondingModelIndex].role === 'model' &&
          !result.some(c => JSON.stringify(c) === JSON.stringify(history[correspondingModelIndex]))) {
        // Add the essential model response back
        result.splice(lastUserIndex + 1, 0, history[correspondingModelIndex]);
      }
    }
    
    return result;
  }
}

/**
 * Enhanced TokenMonitor for aggressive context management
 */
export class AggressiveTokenMonitor {
  private contextManager: AggressiveContextManager;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(contextManager: AggressiveContextManager) {
    this.contextManager = contextManager;
  }

  /**
   * Start monitoring token usage at regular intervals with aggressive cleanup
   */
  startMonitoring(
    history: Content[],
    config: Config,
    callback: (cleanedHistory: Content[], knowledgeExtracted: ExtractedKnowledge[]) => void,
    intervalMs: number = 3000, // Check more frequently for aggressive management
  ): void {
    this.stopMonitoring();

    this.monitoringInterval = setInterval(async () => {
      const result = await this.contextManager.monitorAndCleanup(history, config);
      
      if (result.knowledgeExtracted.length > 0) {
        // If knowledge was extracted, call the callback with cleaned history
        callback(result.newHistory, result.knowledgeExtracted);
      }
    }, intervalMs);
  }

  /**
   * Stop the monitoring interval
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
  }

  /**
   * Perform a single check of token usage and trigger aggressive cleanup if needed
   */
  async checkAndCleanup(
    history: Content[],
    config?: Config,
    jobId?: string,
  ): Promise<{ newHistory: Content[], knowledgeExtracted: ExtractedKnowledge[] }> {
    return await this.contextManager.monitorAndCleanup(history, config, jobId);
  }
}