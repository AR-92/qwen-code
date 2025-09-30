/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { Config } from '../config/config.js';
import { ContextManager, type ExtractedKnowledge } from './contextManager.js';

/**
 * Enhanced knowledge extraction and storage system
 */
export class KnowledgeStorageSystem {
  private contextManager: ContextManager;
  private storagePath: string;
  private knowledgeIndex: Map<string, ExtractedKnowledge[]> = new Map();

  constructor(contextManager: ContextManager, storagePath?: string) {
    this.contextManager = contextManager;
    this.storagePath = storagePath || './knowledge-storage';
  }

  /**
   * Extract and store knowledge from content with enhanced pattern recognition
   */
  async extractAndStoreKnowledgeFromContent(
    content: string | Content[],
    tags: string[] = [],
    jobId?: string
  ): Promise<ExtractedKnowledge[]> {
    const knowledgeList: ExtractedKnowledge[] = [];
    const timestamp = Date.now();

    if (typeof content === 'string') {
      // Extract knowledge from a single text string
      const extracted = this.extractKnowledgeFromText(content, timestamp, [...tags, ...(jobId ? [jobId] : [])], jobId);
      knowledgeList.push(...extracted);
    } else {
      // Extract knowledge from Content array
      for (const item of content) {
        if (item.parts) {
          for (const part of item.parts) {
            if (part.text) {
              const extracted = this.extractKnowledgeFromText(part.text, timestamp, [...tags, ...(jobId ? [jobId] : [])], jobId);
              knowledgeList.push(...extracted);
            }
          }
        }
      }
    }

    // Add the extracted knowledge to our system
    for (const knowledge of knowledgeList) {
      this.addKnowledge(knowledge);
    }

    return knowledgeList;
  }

  /**
   * Enhanced knowledge extraction with more sophisticated pattern recognition
   */
  private extractKnowledgeFromText(
    text: string,
    timestamp: number,
    tags: string[],
    jobId?: string
  ): ExtractedKnowledge[] {
    const knowledge: ExtractedKnowledge[] = [];
    
    // Use more sophisticated patterns for knowledge extraction
    const patterns = [
      // Look for technical definitions
      {
        regex: /(function|method|class|interface|type)\s+(\w+)(\s+|\s*\([^)]*\)\s*|\s*{)/gi,
        tag: 'technical-definition',
        formatter: (match: RegExpMatchArray) => `Definition of ${match[1]} ${match[2]}`
      },
      // Look for requirements or constraints
      {
        regex: /((?:require|need|must|should|has to|needs to)\s+[^.!?;]+)/gi,
        tag: 'requirement',
        formatter: (match: RegExpMatchArray) => `Requirement: ${match[0].trim()}`
      },
      // Look for decisions or conclusions
      {
        regex: /((?:Decision|Conclusion|Outcome|Result):\s*[^.!?]+)/gi,
        tag: 'decision',
        formatter: (match: RegExpMatchArray) => match[0].trim()
      },
      // Look for important notes
      {
        regex: /((?:Note|Important|Warning|Critical):\s*[^.!?]+)/gi,
        tag: 'important-note',
        formatter: (match: RegExpMatchArray) => match[0].trim()
      },
      // Look for file paths or specific references
      {
        regex: /(?:('|")[^'"]*?\.(?:js|ts|tsx|jsx|py|java|cpp|html|css|json|md)('|")|`[^`]*?\.(?:js|ts|tsx|jsx|py|java|cpp|html|css|json|md)`)/gi,
        tag: 'file-reference',
        formatter: (match: RegExpMatchArray) => `File reference: ${match[0].replace(/['"`]/g, '')}`
      },
      // Look for TODOs and FIXMEs
      {
        regex: /(\/\/\s*|\/\*\*?\s*|<!--\s*)(TODO|FIXME|BUG|HACK|XXX)(:?\s*[^.!?]+)/gi,
        tag: 'todo-fixme',
        formatter: (match: RegExpMatchArray) => `TODO/FIXME: ${match[2]}${match[3].trim()}`
      },
      // Look for key-value configurations
      {
        regex: /(["']?[\w-]+["']?\s*[:=]\s*["'][^"']*["'])/gi,
        tag: 'configuration',
        formatter: (match: RegExpMatchArray) => `Configuration: ${match[0].trim()}`
      }
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const content = pattern.formatter(match);
        knowledge.push({
          id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: content,
          timestamp,
          tags: [pattern.tag, ...tags],
          source: jobId
        });
      }
    }

    // Extract important text chunks that don't match specific patterns
    if (knowledge.length === 0) {
      // Look for important text sections based on length and keywords
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 30);
      for (const sentence of sentences) {
        const lowerSentence = sentence.toLowerCase();
        if (
          lowerSentence.includes('important') ||
          lowerSentence.includes('critical') ||
          lowerSentence.includes('essential') ||
          lowerSentence.includes('key') ||
          sentence.trim().length > 100 // Long sentences might contain important info
        ) {
          knowledge.push({
            id: `kb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: sentence.trim().substring(0, 500) + (sentence.trim().length > 500 ? '...' : ''), // Limit length
            timestamp,
            tags: ['general', ...tags],
            source: jobId
          });
        }
      }
    }

    return knowledge;
  }

  /**
   * Add knowledge to the system with advanced categorization
   */
  addKnowledge(knowledge: ExtractedKnowledge): void {
    // Store in the context manager for immediate access
    this.contextManager.addKnowledge(knowledge);

    // Store in our local index for efficient retrieval
    for (const tag of knowledge.tags) {
      if (!this.knowledgeIndex.has(tag)) {
        this.knowledgeIndex.set(tag, []);
      }
      this.knowledgeIndex.get(tag)!.push(knowledge);
    }
  }

  /**
   * Retrieve knowledge by tags with fuzzy matching
   */
  getKnowledgeByTags(tags: string[], fuzzy: boolean = false): ExtractedKnowledge[] {
    const results: ExtractedKnowledge[] = [];

    for (const tag of tags) {
      // Direct match
      if (this.knowledgeIndex.has(tag)) {
        results.push(...this.knowledgeIndex.get(tag)!);
      }

      // Fuzzy match if requested
      if (fuzzy) {
        for (const [indexTag, knowledgeList] of this.knowledgeIndex.entries()) {
          if (indexTag.toLowerCase().includes(tag.toLowerCase())) {
            results.push(...knowledgeList);
          }
        }
      }
    }

    // Remove duplicates based on content
    return this.deduplicateKnowledge(results);
  }

  /**
   * Retrieve knowledge by similarity to a query
   */
  getKnowledgeBySimilarity(query: string, limit: number = 10): ExtractedKnowledge[] {
    const allKnowledge = this.getAllKnowledge();
    
    // Simple similarity based on keyword matching
    const scoredKnowledge = allKnowledge.map(k => {
      const contentLower = k.content.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Count how many query words appear in the knowledge content
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
      const matches = queryWords.filter(word => contentLower.includes(word)).length;
      
      return {
        knowledge: k,
        score: matches
      };
    });

    // Sort by score and return top results
    return scoredKnowledge
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.knowledge);
  }

  /**
   * Get all stored knowledge
   */
  getAllKnowledge(): ExtractedKnowledge[] {
    const allKnowledge: ExtractedKnowledge[] = [];
    for (const knowledgeList of this.knowledgeIndex.values()) {
      allKnowledge.push(...knowledgeList);
    }
    return this.deduplicateKnowledge(allKnowledge);
  }

  /**
   * Remove duplicate knowledge entries
   */
  private deduplicateKnowledge(knowledgeList: ExtractedKnowledge[]): ExtractedKnowledge[] {
    const seen = new Set<string>();
    const uniqueKnowledge: ExtractedKnowledge[] = [];

    for (const knowledge of knowledgeList) {
      const key = `${knowledge.content}-${knowledge.tags.join(',')}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueKnowledge.push(knowledge);
      }
    }

    return uniqueKnowledge;
  }

  /**
   * Search knowledge by content
   */
  searchKnowledge(searchTerm: string): ExtractedKnowledge[] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return this.getAllKnowledge().filter(knowledge => 
      knowledge.content.toLowerCase().includes(lowerSearchTerm)
    );
  }

  /**
   * Persist knowledge to storage (placeholder implementation)
   */
  async persistKnowledge(): Promise<void> {
    // In a real implementation, this would save the knowledge to a file or database
    console.log(`Knowledge storage system: Persisting ${this.getAllKnowledge().length} knowledge items to ${this.storagePath}`);
  }

  /**
   * Load knowledge from storage (placeholder implementation)
   */
  async loadKnowledge(): Promise<void> {
    // In a real implementation, this would load knowledge from a file or database
    console.log(`Knowledge storage system: Loading knowledge from ${this.storagePath}`);
  }

  /**
   * Clear all stored knowledge
   */
  clearKnowledge(): void {
    this.knowledgeIndex.clear();
    this.contextManager.clearKnowledge();
  }

  /**
   * Get knowledge statistics
   */
  getKnowledgeStats(): { total: number; byTag: Map<string, number> } {
    const allKnowledge = this.getAllKnowledge();
    const byTag = new Map<string, number>();
    
    for (const knowledge of allKnowledge) {
      for (const tag of knowledge.tags) {
        byTag.set(tag, (byTag.get(tag) || 0) + 1);
      }
    }
    
    return {
      total: allKnowledge.length,
      byTag
    };
  }
}

/**
 * Enhanced tool for knowledge extraction and management
 */
export class EnhancedKnowledgeExtractorTool {
  private knowledgeStorage: KnowledgeStorageSystem;
  private config: Config;  // Store the config for potential use

  constructor(config: Config, contextManager: ContextManager) {
    this.config = config;
    this.knowledgeStorage = new KnowledgeStorageSystem(contextManager);
  }

  /**
   * Extract knowledge from the current conversation history
   */
  async extractFromCurrentHistory(
    jobId?: string,
    tags: string[] = []
  ): Promise<ExtractedKnowledge[]> {
    // Using config to access model to ensure the config property is used
    // This could be used for knowledge extraction based on the model type
    const model = this.config.getModel();
    const modelSpecificTags = [...tags, `model:${model}`]; // Add model-specific tag
    
    // Get conversation history from the client
    // const client = this.config.getGeminiClient();
    
    // For now, we'll return an empty array since we don't have direct access to the history
    // In a real implementation, this would get the history and extract knowledge from it
    const mockContent: Content[] = [];
    
    return await this.knowledgeStorage.extractAndStoreKnowledgeFromContent(
      mockContent,
      modelSpecificTags,
      jobId
    );
  }

  /**
   * Retrieve knowledge by tags
   */
  getKnowledgeByTags(tags: string[], fuzzy: boolean = false): ExtractedKnowledge[] {
    return this.knowledgeStorage.getKnowledgeByTags(tags, fuzzy);
  }

  /**
   * Search knowledge by content
   */
  searchKnowledge(searchTerm: string): ExtractedKnowledge[] {
    return this.knowledgeStorage.searchKnowledge(searchTerm);
  }

  /**
   * Get knowledge by similarity to a query
   */
  getKnowledgeBySimilarity(query: string, limit: number = 10): ExtractedKnowledge[] {
    return this.knowledgeStorage.getKnowledgeBySimilarity(query, limit);
  }

  /**
   * Get knowledge statistics
   */
  getKnowledgeStats() {
    return this.knowledgeStorage.getKnowledgeStats();
  }

  /**
   * Get the knowledge storage system instance
   */
  getKnowledgeStorage(): KnowledgeStorageSystem {
    return this.knowledgeStorage;
  }
}