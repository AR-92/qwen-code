/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import { ContextManager, type ExtractedKnowledge } from './contextManager.js';
import type { Config } from '../config/config.js';

/**
 * TokenMonitor provides real-time monitoring of token usage in conversations
 * and automatically triggers context management when thresholds are exceeded.
 */
export class TokenMonitor {
  private contextManager: ContextManager;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  /**
   * Start monitoring token usage at regular intervals
   * @param history The conversation history to monitor
   * @param config The configuration to use for token counting
   * @param callback Function to call when cleanup is needed
   * @param intervalMs How often to check token usage (default: 5000ms)
   */
  startMonitoring(
    history: Content[],
    config: Config,
    callback: (cleanedHistory: Content[], knowledgeExtracted: ExtractedKnowledge[]) => void,
    intervalMs: number = 5000,
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
   * Perform a single check of token usage and trigger cleanup if needed
   */
  async checkAndCleanup(
    history: Content[],
    config?: Config,
    jobId?: string,
  ): Promise<{ newHistory: Content[], knowledgeExtracted: ExtractedKnowledge[] }> {
    return await this.contextManager.monitorAndCleanup(history, config, jobId);
  }
}

// Export the types used by TokenMonitor
export type { ExtractedKnowledge } from './contextManager.js';