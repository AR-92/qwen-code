/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import type { UserIntent } from './enhancedContextManager.js';
import type { AnyDeclarativeTool } from '../tools/tools.js';

// Use a type alias to make it clearer
type Tool = AnyDeclarativeTool;

// Represents a tool's predicted effectiveness for a specific intent
interface ToolEffectivenessPrediction {
  tool: Tool;
  predictedEffectiveness: number; // 0-1 scale
  reasoning: string;
  contextRelevance: number; // How relevant this tool is to current context
}

/**
 * AI-powered Tool Selection Engine
 * Predicts which tools would be most effective for a given intent and context
 */
export class SmartToolSelector {
  private toolRegistry: Map<string, Tool>;
  private effectivenessModels: Map<string, (intent: UserIntent, context: Content[]) => number>;

  constructor() {
    this.toolRegistry = new Map();
    this.effectivenessModels = new Map();
    this.initializeEffectivenessModels();
  }

  /**
   * Register a tool for smart selection
   */
  registerTool(tool: Tool): void {
    const key = tool.name || tool.constructor.name || 'unnamed-tool';
    this.toolRegistry.set(key, tool); // Using name as key
  }

  /**
   * Predict which tools would be most effective for the given intent and context
   */
  async predictEffectiveTools(intent: UserIntent, context: Content[]): Promise<ToolEffectivenessPrediction[]> {
    const predictions: ToolEffectivenessPrediction[] = [];
    
    for (const [, tool] of this.toolRegistry) {
      const effectiveness = this.predictToolEffectiveness(tool, intent, context);
      const contextRelevance = this.calculateContextRelevance(tool, context);
      
      predictions.push({
        tool,
        predictedEffectiveness: effectiveness,
        reasoning: this.generateReasoning(tool, intent, context),
        contextRelevance
      });
    }
    
    // Sort by combined effectiveness score (intent effectiveness + context relevance)
    return predictions
      .sort((a, b) => (b.predictedEffectiveness * 0.7 + b.contextRelevance * 0.3) - 
                         (a.predictedEffectiveness * 0.7 + a.contextRelevance * 0.3));
  }

  /**
   * Select top N most effective tools for the given intent and context
   */
  async selectOptimalTools(intent: UserIntent, context: Content[], count: number = 3): Promise<Tool[]> {
    const predictions = await this.predictEffectiveTools(intent, context);
    return predictions.slice(0, count).map(p => p.tool);
  }

  /**
   * Predict how effective a tool would be for a specific intent
   */
  private predictToolEffectiveness(tool: Tool, intent: UserIntent, context: Content[]): number {
    return this.getEffectiveness(tool, intent, context);
  }

  /**
   * Calculate how relevant a tool is to the current context
   */
  private calculateContextRelevance(tool: Tool, context: Content[]): number {
    // Simple heuristic: if context mentions files, prioritize file tools
    const hasFileReferences = context.some(content => 
      content.parts?.some(part => part.text && /\.(js|ts|py|java|cpp|go|rust|html|css|json|yaml|md)$/i.test(part.text || ''))
    );

    // If it's a file-related tool and context has file references, increase relevance
    if (hasFileReferences && /read|edit|write|glob|grep|ls/.test(tool.constructor.name.toLowerCase())) {
      return 0.9;
    }

    // If context has shell commands and this is a shell tool
    if (context.some(content => content.parts?.some(part => part.text && /bash|shell|command|execute/.test(part.text || ''))) && 
        /shell|execute/.test(tool.constructor.name.toLowerCase())) {
      return 0.8;
    }

    // Default relevance
    return 0.5;
  }

  /**
   * Generate reasoning for why a tool is predicted to be effective
   */
  private generateReasoning(tool: Tool, intent: UserIntent, context: Content[]): string {
    const reasons: string[] = [];

    // Add intent-based reasoning
    if (intent.type === 'code-change' && /read|edit|write/.test(tool.constructor.name.toLowerCase())) {
      reasons.push("Matches code change intent");
    }

    if (intent.type === 'query' && /read|grep|glob|web-search/.test(tool.constructor.name.toLowerCase())) {
      reasons.push("Matches information seeking intent");
    }

    if (intent.type === 'debug' && /read|grep|shell/.test(tool.constructor.name.toLowerCase())) {
      reasons.push("Matches debugging intent");
    }

    // Add context-based reasoning
    if (this.calculateContextRelevance(tool, context) > 0.7) {
      reasons.push("Highly relevant to current context");
    }

    if (reasons.length === 0) {
      reasons.push("General purpose tool for various tasks");
    }

    return reasons.join(", ");
  }

  /**
   * Initialize effectiveness prediction models for different tool types
   */
  private initializeEffectivenessModels(): void {
    // File reading tools work well for query and debug intents
    this.effectivenessModels.set('ReadFileTool', (intent: UserIntent) => {
      if (intent.type === 'query' || intent.type === 'debug') {
        return 0.8;
      }
      return 0.4;
    });
    
    // Alternative tool names check - look for tools containing "read" in the name
    this.effectivenessModels.set('read-file', (intent: UserIntent) => {
      if (intent.type === 'query' || intent.type === 'debug') {
        return 0.8;
      }
      return 0.4;
    });

    // File editing tools work well for code-change intents
    this.effectivenessModels.set('EditTool', (intent: UserIntent) => {
      if (intent.type === 'code-change') {
        return 0.9;
      }
      return 0.2;
    });
    
    // Alternative tool names check - look for tools containing "edit" in the name
    this.effectivenessModels.set('edit', (intent: UserIntent) => {
      if (intent.type === 'code-change') {
        return 0.9;
      }
      return 0.2;
    });

    // Shell tools work well for debug intents
    this.effectivenessModels.set('ShellTool', (intent: UserIntent) => {
      if (intent.type === 'debug' || intent.type === 'research') {
        return 0.7;
      }
      return 0.3;
    });
    
    // Alternative tool names check
    this.effectivenessModels.set('shell', (intent: UserIntent) => {
      if (intent.type === 'debug' || intent.type === 'research') {
        return 0.7;
      }
      return 0.3;
    });

    // Web search tools work well for research and query intents
    this.effectivenessModels.set('WebSearchTool', (intent: UserIntent) => {
      if (intent.type === 'research' || intent.type === 'query') {
        return 0.85;
      }
      return 0.4;
    });
    
    // Alternative tool names check
    this.effectivenessModels.set('web-search', (intent: UserIntent) => {
      if (intent.type === 'research' || intent.type === 'query') {
        return 0.85;
      }
      return 0.4;
    });
  }
  
  /**
   * Get effectiveness for a specific tool and intent
   */
  private getEffectiveness(tool: Tool, intent: UserIntent, context: Content[]): number {
    // Get the effectiveness model for this tool type by checking various possible names
    let model = this.effectivenessModels.get(tool.constructor.name);
    
    if (!model) {
      // Try with lowercase tool name
      model = this.effectivenessModels.get(tool.name?.toLowerCase() || '');
    }
    
    if (!model) {
      // Try with name derived from tool properties
      const toolName = tool.name?.toLowerCase() || tool.constructor.name.toLowerCase();
      model = this.effectivenessModels.get(toolName);
    }
    
    if (!model) {
      // Try a partial match for the tool name if it contains relevant keywords
      const toolName = tool.name?.toLowerCase() || tool.constructor.name.toLowerCase();
      if (toolName.includes('edit') || toolName.includes('modify')) {
        model = this.effectivenessModels.get('edit') || this.effectivenessModels.get('EditTool');
      } else if (toolName.includes('read') || toolName.includes('view')) {
        model = this.effectivenessModels.get('read-file') || this.effectivenessModels.get('ReadFileTool');
      } else if (toolName.includes('shell') || toolName.includes('execute')) {
        model = this.effectivenessModels.get('shell') || this.effectivenessModels.get('ShellTool');
      } else if (toolName.includes('web') || toolName.includes('search')) {
        model = this.effectivenessModels.get('web-search') || this.effectivenessModels.get('WebSearchTool');
      }
    }
    
    // Get the effectiveness score or use default
    const effectiveness = model ? model.call(this, intent, context) : 0.5;
    
    // Calculate context relevance
    const contextRelevance = this.calculateContextRelevance(tool, context);
    
    // Return weighted average of effectiveness and context relevance
    return (effectiveness * 0.7) + (contextRelevance * 0.3);
  }
}