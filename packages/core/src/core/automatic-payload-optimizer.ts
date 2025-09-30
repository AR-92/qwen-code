/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import { ContextManager } from './contextManager.js';
import { AggressiveContextManager, AggressiveTokenMonitor } from './aggressiveContextManager.js';
import { KnowledgeStorageSystem } from './knowledge-storage-system.js';

/**
 * Configuration for the AutomaticPayloadOptimizer
 */
export interface PayloadOptimizerConfig {
  // Threshold for triggering optimization (0.0 to 1.0)
  optimizationThreshold: number;
  // Whether to use aggressive context reduction
  useAggressiveReduction: boolean;
  // Whether to automatically extract knowledge
  autoExtractKnowledge: boolean;
  // Model name for token counting
  model: string;
  // Fixed token threshold for optimization
  fixedTokenThreshold?: number;
}

/**
 * Automatic payload optimization system that combines all optimization strategies
 */
export class AutomaticPayloadOptimizer {
  private contextManager: ContextManager;
  private knowledgeStorage: KnowledgeStorageSystem;
  private config: PayloadOptimizerConfig;
  private tokenMonitor?: AggressiveTokenMonitor;

  constructor(
    config?: Partial<PayloadOptimizerConfig>,
    contextManager?: ContextManager
  ) {
    const defaultConfig: PayloadOptimizerConfig = {
      optimizationThreshold: 0.7, // Start optimization at 70% of token limit
      useAggressiveReduction: false,
      autoExtractKnowledge: true,
      model: 'gemini-2.0-flash',
      fixedTokenThreshold: 3500, // Lower threshold for more aggressive optimization
    };

    this.config = { ...defaultConfig, ...config };
    
    // Use provided context manager or create a new one
    if (contextManager) {
      this.contextManager = contextManager;
    } else {
      if (this.config.useAggressiveReduction) {
        this.contextManager = new AggressiveContextManager({
          cleanupThreshold: this.config.optimizationThreshold,
          maxKnowledgeEntries: 100,
          autoExtractKnowledge: this.config.autoExtractKnowledge,
          model: this.config.model,
          fixedTokenThreshold: this.config.fixedTokenThreshold,
          aggressiveToolResponseFiltering: true,
          enableTextCompression: true,
          removeRedundantContent: true,
          enableSummarization: true,
        });
      } else {
        this.contextManager = new ContextManager({
          cleanupThreshold: this.config.optimizationThreshold,
          maxKnowledgeEntries: 100,
          autoExtractKnowledge: this.config.autoExtractKnowledge,
          model: this.config.model,
          fixedTokenThreshold: this.config.fixedTokenThreshold,
        });
      }
    }
    
    this.knowledgeStorage = new KnowledgeStorageSystem(this.contextManager);
  }

  /**
   * Optimize payload by checking token usage and applying appropriate strategies
   */
  async optimizePayload(
    history: Content[],
    config?: Config,
    jobId?: string
  ): Promise<{ newHistory: Content[], knowledgeExtracted: any[] }> {
    // Check if optimization is needed based on token usage
    const shouldOptimize = await this.contextManager.shouldCleanupContext(history, config);
    
    if (shouldOptimize) {
      // Perform optimization
      return await this.contextManager.monitorAndCleanup(history, config, jobId);
    }
    
    // If no optimization needed, return original history
    return {
      newHistory: history,
      knowledgeExtracted: []
    };
  }

  /**
   * Perform a deep optimization that applies all available strategies
   */
  async deepOptimize(
    history: Content[],
    config?: Config,
    jobId?: string
  ): Promise<{ newHistory: Content[], knowledgeExtracted: any[] }> {
    // First, extract knowledge from the current history
    let knowledgeExtracted: any[] = [];
    
    if (this.config.autoExtractKnowledge) {
      for (const content of history) {
        if (content.parts) {
          for (const part of content.parts) {
            if (part.text) {
              const extracted = await this.knowledgeStorage.extractAndStoreKnowledgeFromContent(
                part.text,
                jobId ? [jobId] : [],
                jobId
              );
              knowledgeExtracted.push(...extracted);
            }
          }
        }
      }
    }

    // Apply context reduction strategies
    let optimizedHistory = [...history];

    // If using aggressive context manager, it will apply its own strategies
    if (this.contextManager instanceof AggressiveContextManager) {
      optimizedHistory = this.contextManager.filterContextPublic(optimizedHistory);
    } else {
      // Apply basic filtering
      optimizedHistory = this.basicFilterContext(optimizedHistory);
    }

    return {
      newHistory: optimizedHistory,
      knowledgeExtracted
    };
  }

  /**
   * Basic context filtering for non-aggressive context managers
   */
  private basicFilterContext(history: Content[]): Content[] {
    // Keep essential content: user queries, model responses, and important tool results
    return history.filter(content => {
      // Always keep user and model roles
      if (content.role === 'user' || content.role === 'model') {
        return true;
      }

      // For other roles (tool responses), keep if they contain important info
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Keep if it contains error, success, or important keywords
            const lowerText = part.text.toLowerCase();
            if (
              lowerText.includes('error') || 
              lowerText.includes('success') || 
              lowerText.includes('done') || 
              lowerText.includes('completed') ||
              part.text.length < 500 // Keep shorter responses that might be useful
            ) {
              return true;
            }
          }
        }
      }

      // For other content without important indicators, filter out
      return false;
    });
  }

  /**
   * Calculate payload statistics
   */
  async getPayloadStatistics(history: Content[], config?: Config): Promise<{
    tokensUsed: number;
    tokensLimit: number;
    percentageUsed: number;
    estimatedCompressionRatio: number;
  }> {
    const contextUsage = await this.contextManager.getContextUsage(history, config);
    
    // Estimate how much we could compress the history
    const originalLength = this.estimateContentLength(history);
    const compressedLength = this.estimateCompressedContentLength(history);
    const estimatedCompressionRatio = compressedLength > 0 ? 
      originalLength / compressedLength : 1;
    
    return {
      tokensUsed: contextUsage.tokensUsed,
      tokensLimit: contextUsage.tokensLimit,
      percentageUsed: contextUsage.percentageUsed,
      estimatedCompressionRatio
    };
  }

  /**
   * Estimate the length of content for compression ratio calculation
   */
  private estimateContentLength(history: Content[]): number {
    let totalLength = 0;
    for (const content of history) {
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            totalLength += part.text.length;
          }
        }
      }
    }
    return totalLength;
  }

  /**
   * Estimate the compressed length of content
   */
  private estimateCompressedContentLength(history: Content[]): number {
    let totalLength = 0;
    for (const content of history) {
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Apply same logic as in our aggressive context manager
            if (part.text.length > 500) {
              // If the text is long, we might compress it to essential parts only
              const essentialParts = this.extractEssentialText(part.text);
              totalLength += essentialParts.length;
            } else {
              // Shorter texts are preserved more completely
              totalLength += part.text.length * 0.8; // Assume some compression
            }
          }
        }
      }
    }
    return totalLength;
  }

  /**
   * Extract essential text similar to our aggressive manager
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

    // If we found essential content, return it
    if (essentialLines.length > 0) {
      return essentialLines.slice(0, 5).join(' ') + (essentialLines.length > 5 ? '...' : '');
    }

    // If no essential patterns found, preserve first and last parts
    if (text.length > 100) {
      const start = text.substring(0, 100);
      const end = text.substring(text.length - 100);
      return `${start}...[content shortened]...${end}`;
    }

    return text;
  }

  /**
   * Start automatic monitoring for payload optimization
   */
  startAutomaticOptimization(
    history: Content[],
    config: Config,
    callback: (optimizedHistory: Content[], knowledgeExtracted: any[]) => void,
    intervalMs: number = 5000
  ): void {
    // Use the aggressive token monitor if we're in aggressive mode
    if (this.contextManager instanceof AggressiveContextManager) {
      this.tokenMonitor = new AggressiveTokenMonitor(this.contextManager);
      this.tokenMonitor.startMonitoring(
        history,
        config,
        (newHistory, knowledgeExtracted) => {
          // Update the history reference and call the callback
          callback(newHistory, knowledgeExtracted);
        },
        intervalMs
      );
    } else {
      // For non-aggressive mode, we'll use a custom monitoring approach
      setInterval(async () => {
        const result = await this.optimizePayload(history, config);
        if (result.knowledgeExtracted.length > 0) {
          callback(result.newHistory, result.knowledgeExtracted);
        }
      }, intervalMs);
    }
  }

  /**
   * Stop automatic optimization monitoring
   */
  stopAutomaticOptimization(): void {
    if (this.tokenMonitor) {
      this.tokenMonitor.stopMonitoring();
      this.tokenMonitor = undefined;
    }
  }

  /**
   * Get the context manager instance
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  /**
   * Get the knowledge storage system
   */
  getKnowledgeStorage(): KnowledgeStorageSystem {
    return this.knowledgeStorage;
  }

  /**
   * Update the optimization threshold
   */
  setOptimizationThreshold(threshold: number): void {
    this.config.optimizationThreshold = threshold;
    this.contextManager.setCleanupThreshold(threshold);
  }

  /**
   * Update the fixed token threshold
   */
  setFixedTokenThreshold(threshold: number): void {
    this.config.fixedTokenThreshold = threshold;
    this.contextManager.setFixedTokenThreshold(threshold);
  }
}

/**
 * Tool to provide automatic payload optimization as a service
 */
export class PayloadOptimizationTool {
  private optimizer: AutomaticPayloadOptimizer;

  constructor(config?: Partial<PayloadOptimizerConfig>) {
    this.optimizer = new AutomaticPayloadOptimizer(config);
  }

  /**
   * Optimize a conversation history to reduce payload size
   */
  async optimizeHistory(
    history: Content[],
    config?: Config,
    jobId?: string
  ): Promise<{ optimizedHistory: Content[], knowledgeExtracted: any[] }> {
    const result = await this.optimizer.optimizePayload(history, config, jobId);
    return {
      optimizedHistory: result.newHistory,
      knowledgeExtracted: result.knowledgeExtracted
    };
  }

  /**
   * Perform deep optimization for maximum payload reduction
   */
  async deepOptimizeHistory(
    history: Content[],
    config?: Config,
    jobId?: string
  ): Promise<{ optimizedHistory: Content[], knowledgeExtracted: any[] }> {
    const result = await this.optimizer.deepOptimize(history, config, jobId);
    return {
      optimizedHistory: result.newHistory,
      knowledgeExtracted: result.knowledgeExtracted
    };
  }

  /**
   * Get payload statistics
   */
  async getStatistics(history: Content[], config?: Config) {
    return await this.optimizer.getPayloadStatistics(history, config);
  }

  /**
   * Start automatic optimization monitoring
   */
  startMonitoring(
    history: Content[],
    config: Config,
    callback: (optimizedHistory: Content[], knowledgeExtracted: any[]) => void,
    intervalMs: number = 5000
  ): void {
    this.optimizer.startAutomaticOptimization(history, config, callback, intervalMs);
  }

  /**
   * Stop automatic optimization monitoring
   */
  stopMonitoring(): void {
    this.optimizer.stopAutomaticOptimization();
  }
}