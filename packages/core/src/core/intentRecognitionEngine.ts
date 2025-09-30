/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { UserIntent } from './enhancedContextManager.js';

/**
 * AI-powered Intent Recognition Engine
 * Analyzes user input to understand their true intent beyond literal text
 */
export class IntentRecognitionEngine {
  /**
   * Analyze user input and current context to predict intent
   */
  async predictIntent(userInput: string, context: Content[]): Promise<UserIntent> {
    // Basic classification with enhanced confidence
    const intentType = this.classifyIntent(userInput);
    const confidence = await this.estimateIntentConfidence(userInput, context);
    
    return {
      id: `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: intentType,
      confidence,
      targets: await this.extractTargets(userInput, context),
      expectedOutcome: await this.predictOutcome(userInput, context)
    };
  }

  /**
   * Classify the type of intent from user input
   */
  private classifyIntent(userInput: string): UserIntent['type'] {
    const lowerInput = userInput.toLowerCase();
    
    // Look for specific intent patterns
    if (/(change|modify|update|edit|fix|implement|add|create|write|make|build)/i.test(lowerInput)) {
      return 'code-change';
    } else if (/(what|how|why|explain|describe|understand|find|search|query|show me|tell me)/i.test(lowerInput)) {
      return 'query';
    } else if (/(debug|fix|error|bug|problem|issue|trace|solve)/i.test(lowerInput)) {
      return 'debug';
    } else if (/(refactor|restructure|improve|optimize|clean|simplify|reorganize)/i.test(lowerInput)) {
      return 'refactor';
    } else if (/(research|study|learn|investigate|explore|compare|analyze)/i.test(lowerInput)) {
      return 'research';
    } else {
      return 'other';
    }
  }

  /**
   * Estimate confidence in intent classification
   */
  private async estimateIntentConfidence(userInput: string, context: Content[]): Promise<number> {
    // Calculate confidence based on keyword specificity and context
    let confidence = 0.5; // Base confidence
    
    // Intent-specific keywords that indicate high confidence
    const intentKeywords = [
      { pattern: /change|modify|update|edit|implement|add|create|write|make|build/i, weight: 0.3 },
      { pattern: /debug|fix|solve|resolve|troubleshoot|troubleshooting/i, weight: 0.35 },
      { pattern: /what|how|why|explain|describe|understand|find|show me|tell me|query|search/i, weight: 0.3 },
      { pattern: /refactor|restructure|improve|optimize|clean|simplify|reorganize/i, weight: 0.3 },
      { pattern: /research|study|learn|investigate|explore|compare|analyze/i, weight: 0.25 }
    ];
    
    for (const keyword of intentKeywords) {
      if (keyword.pattern.test(userInput)) {
        confidence = Math.max(confidence, 0.65 + keyword.weight); // Start with higher base
        break; // Only count the first matching intent keyword
      }
    }
    
    // Specific technical keywords increase confidence further
    const technicalKeywords = [
      { pattern: /function|class|method|variable|parameter/i, weight: 0.1 },
      { pattern: /\.(js|ts|py|java|cpp|go|rust|html|css|json|yaml|md)$/i, weight: 0.1 },
      { pattern: /(async|await|promise|callback|closure|scope)/i, weight: 0.1 },
      { pattern: /(error|exception|bug|warning|critical|fatal)/i, weight: 0.15 },
      { pattern: /(refactor|optimize|performance|memory|cache)/i, weight: 0.1 }
    ];
    
    for (const keyword of technicalKeywords) {
      if (keyword.pattern.test(userInput)) {
        confidence += keyword.weight;
      }
    }
    
    // Ensure confidence doesn't exceed 1.0
    return Math.min(confidence, 1.0);
  }

  /**
   * Extract specific targets (files, functions, concepts) from user input and context
   */
  private async extractTargets(userInput: string, context: Content[]): Promise<string[]> {
    const targets: string[] = [];
    
    // Extract technical keywords and concepts from user input using more comprehensive patterns
    // Look for specific terms related to authentication, login, etc.
    const authRelatedTerms = userInput.toLowerCase().match(/(auth|authentication|login|user|service|function|module|api|endpoint)/g);
    if (authRelatedTerms) {
      targets.push(...authRelatedTerms.filter((term, index, arr) => arr.indexOf(term) === index));
    }
    
    // Extract file references from user input
    const filePattern = /(?:\s|^)([a-zA-Z0-9_\-./]+(?:\.[a-zA-Z]{1,6})+)(?:\s|$)/g;
    let match;
    while ((match = filePattern.exec(userInput)) !== null) {
      if (match[1].length > 1) {
        targets.push(match[1]);
      }
    }
    
    // Extract function/class names with more comprehensive patterns
    const codePattern = /(?:function|class|method|def|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/gi;
    while ((match = codePattern.exec(userInput)) !== null) {
      targets.push(match[1]);
    }
    
    // Extract from context if specific files were mentioned recently
    for (const content of context.slice(-5)) { // Look at last 5 context items
      if (content.parts) {
        for (const part of content.parts) {
          if (part.text) {
            // Look for file patterns in context
            const contextMatches = part.text.match(/(?:\s|^)([a-zA-Z0-9_\-./]+(?:\.[a-zA-Z]{1,6})+)(?:\s|$)/g);
            if (contextMatches) {
              for (const fileMatch of contextMatches) {
                const cleanMatch = fileMatch.trim();
                if (cleanMatch.length > 1 && !targets.includes(cleanMatch)) {
                  targets.push(cleanMatch);
                }
              }
            }
          }
        }
      }
    }
    
    return Array.from(new Set(targets)); // Remove duplicates
  }

  /**
   * Predict the expected outcome of the user's request
   */
  private async predictOutcome(userInput: string, context: Content[]): Promise<string | undefined> {
    // Analyze the action words in the input to predict the desired outcome
    const outcomePatterns = [
      { pattern: /change|modify|update|edit/, outcome: "Modified code implementation" },
      { pattern: /fix|debug|resolve|solve/, outcome: "Fixed an issue or error" },
      { pattern: /add|create|implement/, outcome: "Added new functionality" },
      { pattern: /explain|describe|understand/, outcome: "Explanation of code or concept" },
      { pattern: /refactor|restructure|improve/, outcome: "Improved code structure" },
      { pattern: /find|search|locate/, outcome: "Located specific code or information" },
      { pattern: /optimize|performance/, outcome: "Improved performance" },
    ];
    
    for (const pattern of outcomePatterns) {
      if (pattern.pattern.test(userInput.toLowerCase())) {
        return pattern.outcome;
      }
    }
    
    return undefined;
  }
}