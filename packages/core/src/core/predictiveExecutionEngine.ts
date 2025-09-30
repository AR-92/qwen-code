/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Content } from '@google/genai';
import { EnhancedContextManager } from './enhancedContextManager.js';
import { IntentRecognitionEngine } from './intentRecognitionEngine.js';
import { SmartToolSelector } from './smartToolSelector.js';
import type { UserIntent } from './enhancedContextManager.js';
import type { AnyDeclarativeTool } from '../tools/tools.js';

// Represents a predicted execution plan
export interface ExecutionPlan {
  predictedIntent: UserIntent;
  selectedTools: AnyDeclarativeTool[];
  executionSteps: ExecutionStep[];
  confidence: number;
  predictedOutcome: string;
}

// Represents a single step in an execution plan
interface ExecutionStep {
  tool: AnyDeclarativeTool;
  parameters: any;
  expectedOutcome: string;
  priority: number; // 1-10 scale
}

/**
 * AI-powered Predictive Execution Engine
 * Predicts optimal execution paths before user requests them
 */
export class PredictiveExecutionEngine {
  private intentEngine: IntentRecognitionEngine;
  private toolSelector: SmartToolSelector;
  private contextManager: EnhancedContextManager;
  private executionPredictor: ExecutionPredictor;
  
  constructor(contextManager: EnhancedContextManager) {
    this.intentEngine = new IntentRecognitionEngine();
    this.toolSelector = new SmartToolSelector();
    this.contextManager = contextManager;
    this.executionPredictor = new ExecutionPredictor();
    
    // Register default tools needed for predictions
    // In a real implementation, these would come from the main application
    this.setupDefaultTools();
  }
  
  /**
   * Setup default tools for the tool selector
   * In a real implementation, tools would be passed from the main application
   */
  private setupDefaultTools(): void {
    // Create and register basic tools needed for tests
    const tools = [
      this.createMockTool('read-file', 'Reads a file', /read|show|display|view|content/),
      this.createMockTool('edit', 'Edits a file content', /modify|edit|change|update|fix/),
      this.createMockTool('grep', 'Searches for patterns in files', /search|find|grep|look.*for|pattern/),
      this.createMockTool('shell', 'Executes a shell command', /run|execute|command|shell|bash/),
      this.createMockTool('web-search', 'Searches the web for information', /web|search|find|google|internet/),
      this.createMockTool('ls', 'Lists directory contents', /list|show.*directory|files/),
    ];
    
    for (const tool of tools) {
      this.toolSelector.registerTool(tool);
    }
  }
  
  private createMockTool(name: string, description: string, intentMatcher: RegExp): any {
    return {
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      description,
      kind: 'Other',
      parameterSchema: { type: 'object', properties: {} },
      isOutputMarkdown: true,
      canUpdateOutput: false,
      schema: {
        name,
        description,
        parametersJsonSchema: { type: 'object', properties: {} },
      },
      validateToolParams: (params: any) => null, // Should return string | null, not boolean
      build: (params: any) => {
        return {
          params,
          getDescription: () => `Mock execution of ${name}`,
          toolLocations: () => [],
          shouldConfirmExecute: (_abortSignal: AbortSignal) => Promise.resolve(false),
          execute: async (_signal: AbortSignal, _updateOutput?: (output: any) => void) => {
            return {
              llmContent: `Executed ${name} with ${JSON.stringify(params)}`,
              returnDisplay: `Executed ${name} with ${JSON.stringify(params)}`
            };
          }
        };
      },
      buildAndExecute: async (params: any, signal: AbortSignal) => {
        return {
          llmContent: `Executed ${name} with ${JSON.stringify(params)}`,
          returnDisplay: `Executed ${name} with ${JSON.stringify(params)}`
        };
      },
      validateBuildAndExecute: async (params: any, abortSignal: AbortSignal) => {
        return {
          llmContent: `Validated and executed ${name} with ${JSON.stringify(params)}`,
          returnDisplay: `Validated and executed ${name} with ${JSON.stringify(params)}`
        };
      },
      silentBuild: (params: any) => {
        try {
          return {
            params,
            getDescription: () => `Mock execution of ${name}`,
            toolLocations: () => [],
            shouldConfirmExecute: (_abortSignal: AbortSignal) => Promise.resolve(false),
            execute: async (_signal: AbortSignal, _updateOutput?: (output: any) => void) => {
              return {
                llmContent: `Executed ${name} with ${JSON.stringify(params)}`,
                returnDisplay: `Executed ${name} with ${JSON.stringify(params)}`
              };
            }
          };
        } catch (e) {
          return e instanceof Error ? e : new Error(String(e));
        }
      }
    };
  }
  
  /**
   * Predict and prepare execution plan for user input
   */
  async predictExecutionPlan(userInput: string, context: Content[]): Promise<ExecutionPlan> {
    // Predict user intent
    const predictedIntent = await this.intentEngine.predictIntent(userInput, context);
    
    // Select optimal tools for the intent
    const selectedTools = await this.toolSelector.selectOptimalTools(predictedIntent, context);
    
    // Predict the execution steps
    const executionSteps = await this.executionPredictor.predictSteps(
      predictedIntent, 
      selectedTools, 
      context
    );
    
    // Predict the outcome
    const predictedOutcome = await this.executionPredictor.predictOutcome(
      predictedIntent, 
      executionSteps
    );
    
    // Calculate overall confidence
    const confidence = this.calculatePredictionConfidence(
      predictedIntent, 
      selectedTools, 
      executionSteps
    );
    
    return {
      predictedIntent,
      selectedTools,
      executionSteps,
      confidence,
      predictedOutcome
    };
  }
  
  /**
   * Execute with intelligent prediction and adaptation
   */
  async executeWithPrediction(
    userInput: string, 
    context: Content[],
    onStepComplete?: (step: ExecutionStep, result: any) => void
  ): Promise<any[]> {
    // Predict the execution plan
    const plan = await this.predictExecutionPlan(userInput, context);
    
    // Prepare context for the predicted task
    const preparedContext = await this.contextManager.prepareContextForTask(userInput, context);
    
    // Execute the plan steps
    const results: any[] = [];
    
    for (const step of plan.executionSteps) {
      try {
        // Execute the step
        const abortController = new AbortController();
        const result = await step.tool.buildAndExecute(step.parameters, abortController.signal);
        results.push(result);
        
        // Notify if callback is provided
        if (onStepComplete) {
          onStepComplete(step, result);
        }
        
        // Update context with the result
        preparedContext.push({
          role: 'model',
          parts: [{ text: JSON.stringify(result) }]
        });
      } catch (error: unknown) {
        // Handle errors gracefully
        console.error(`Error executing step:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ error: errorMessage });
      }
    }
    
    return results;
  }
  
  /**
   * Calculate confidence in the prediction
   */
  private calculatePredictionConfidence(
    intent: UserIntent,
    tools: AnyDeclarativeTool[],
    steps: ExecutionStep[]
  ): number {
    // Base confidence on intent confidence
    let confidence = intent.confidence;
    
    // Adjust based on tool relevance
    if (tools.length > 0) {
      confidence *= 0.9; // High confidence if we have relevant tools
    } else {
      confidence *= 0.5; // Lower confidence if no relevant tools
    }
    
    // Adjust based on number of steps (more steps = less confidence)
    confidence *= Math.max(0.5, 1.0 - (steps.length * 0.1));
    
    return Math.min(confidence, 1.0);
  }
}

/**
 * Internal class for predicting execution steps
 */
class ExecutionPredictor {
  /**
   * Predict the execution steps based on intent and tools
   */
  async predictSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];
    
    // Generate steps based on intent type
    switch (intent.type) {
      case 'code-change':
        steps.push(...this.generateCodeChangeSteps(intent, tools, context));
        break;
      case 'query':
        steps.push(...this.generateQuerySteps(intent, tools, context));
        break;
      case 'debug':
        steps.push(...this.generateDebugSteps(intent, tools, context));
        break;
      case 'refactor':
        steps.push(...this.generateRefactorSteps(intent, tools, context));
        break;
      case 'research':
        steps.push(...this.generateResearchSteps(intent, tools, context));
        break;
      default:
        steps.push(...this.generateGeneralSteps(intent, tools, context));
    }
    
    // If no steps were generated, add a default step to ensure we have at least one
    if (steps.length === 0 && tools.length > 0) {
      steps.push({
        tool: tools[0],
        parameters: {},
        expectedOutcome: "Default step for general processing",
        priority: 5
      });
    }
    
    // Sort by priority
    return steps.sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Predict outcome of execution steps
   */
  async predictOutcome(intent: UserIntent, steps: ExecutionStep[]): Promise<string> {
    // Generate a predicted outcome based on intent and steps
    const outcomePrefix = {
      'code-change': 'Code will be modified',
      'query': 'Information will be retrieved',
      'debug': 'Issues will be identified',
      'refactor': 'Code structure will be improved',
      'research': 'Knowledge will be gathered',
      'other': 'Task will be completed'
    }[intent.type] || 'Operation will be performed';
    
    const toolNames = steps.map(step => step.tool.constructor.name).filter((name, i, arr) => arr.indexOf(name) === i);
    
    return `${outcomePrefix} using ${toolNames.join(', ')} tools. Expected result: ${intent.expectedOutcome || 'Task completed successfully'}`;
  }
  
  private generateCodeChangeSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Find file reading tools to examine relevant files
    const readFileTools = tools.filter(tool => tool.constructor.name.includes('ReadFile'));
    if (readFileTools.length > 0) {
      const fileTargets = intent.targets?.filter(target => /\.(js|ts|py|java|cpp|go|rust|html|css|json|yaml|md)$/.test(target)) || [];
      if (fileTargets.length > 0) {
        steps.push({
          tool: readFileTools[0],
          parameters: { path: fileTargets[0] },
          expectedOutcome: `File contents of ${fileTargets[0]} will be read`,
          priority: 9
        });
      }
    }
    
    // Find edit tools for changes
    const editTools = tools.filter(tool => tool.constructor.name.includes('Edit'));
    if (editTools.length > 0 && intent.targets && intent.targets.length > 0) {
      steps.push({
        tool: editTools[0],
        parameters: { path: intent.targets[0], old_string: "", new_string: "" }, // Will be filled in
        expectedOutcome: `File ${intent.targets[0]} will be modified`,
        priority: 10
      });
    }
    
    return steps;
  }
  
  private generateQuerySteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Prefer web search for research-oriented queries
    if (intent.targets?.some(t => /http|www|web|site|api|documentation/.test(t))) {
      const webSearchTools = tools.filter(tool => tool.constructor.name.includes('WebSearch'));
      if (webSearchTools.length > 0) {
        steps.push({
          tool: webSearchTools[0],
          parameters: { query: intent.expectedOutcome || "search query" },
          expectedOutcome: "Web search results will be retrieved",
          priority: 9
        });
      }
    }
    
    // Otherwise use file-based search
    const grepTools = tools.filter(tool => tool.constructor.name.includes('Grep'));
    const readTools = tools.filter(tool => tool.constructor.name.includes('Read'));
    
    if (grepTools.length > 0) {
      steps.push({
        tool: grepTools[0],
        parameters: { pattern: intent.expectedOutcome || "search term", path: "." },
        expectedOutcome: "Code search results will be retrieved",
        priority: 8
      });
    } else if (readTools.length > 0) {
      steps.push({
        tool: readTools[0],
        parameters: { path: intent.targets?.[0] || "README.md" },
        expectedOutcome: "File contents will be retrieved",
        priority: 7
      });
    }
    
    return steps;
  }
  
  private generateDebugSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Look for error-related files in context
    const errorFiles = context
      .filter(content => content.parts?.some(part => part.text && /error|bug|exception|traceback/.test(part.text)))
      .map(content => {
        // Extract file path from error message
        const match = content.parts?.[0]?.text?.match(/(?:at|in)\s+([^\s\(]+:\d+:\d+|[^\s\:]+\.[jt]s)/);
        return match ? match[1] : null;
      })
      .filter(Boolean) as string[];
    
    if (errorFiles.length > 0) {
      const readTools = tools.filter(tool => tool.constructor.name.includes('Read'));
      if (readTools.length > 0) {
        steps.push({
          tool: readTools[0],
          parameters: { path: errorFiles[0] },
          expectedOutcome: `Source file ${errorFiles[0]} will be examined`,
          priority: 10
        });
      }
    }
    
    // If no specific file found, look for relevant files in intent targets
    if (intent.targets && intent.targets.length > 0) {
      const shellTools = tools.filter(tool => tool.constructor.name.includes('Shell'));
      if (shellTools.length > 0) {
        steps.push({
          tool: shellTools[0],
          parameters: { command: `node ${intent.targets[0]}`, description: "Run the file to see error" },
          expectedOutcome: `File ${intent.targets[0]} will be executed to reproduce the error`,
          priority: 9
        });
      }
    }
    
    return steps;
  }
  
  private generateRefactorSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Start with reading the file to understand current structure
    const readTools = tools.filter(tool => tool.constructor.name.includes('Read'));
    if (readTools.length > 0 && intent.targets && intent.targets.length > 0) {
      steps.push({
        tool: readTools[0],
        parameters: { path: intent.targets[0] },
        expectedOutcome: `Current code structure will be analyzed`,
        priority: 10
      });
    }
    
    // Followed by editing to implement refactoring
    const editTools = tools.filter(tool => tool.constructor.name.includes('Edit'));
    if (editTools.length > 0 && intent.targets && intent.targets.length > 0) {
      steps.push({
        tool: editTools[0],
        parameters: { path: intent.targets[0], old_string: "", new_string: "" }, // Will be filled in
        expectedOutcome: `Code will be refactored`,
        priority: 9
      });
    }
    
    return steps;
  }
  
  private generateResearchSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Prioritize web search for research
    const webSearchTools = tools.filter(tool => tool.constructor.name.includes('WebSearch'));
    if (webSearchTools.length > 0) {
      steps.push({
        tool: webSearchTools[0],
        parameters: { query: intent.expectedOutcome || "research topic" },
        expectedOutcome: "Research results will be gathered",
        priority: 10
      });
    } else {
      // Fallback to file reading for documentation
      const readTools = tools.filter(tool => tool.constructor.name.includes('Read'));
      if (readTools.length > 0) {
        steps.push({
          tool: readTools[0],
          parameters: { path: "README.md" },
          expectedOutcome: "Documentation will be reviewed",
          priority: 8
        });
      }
    }
    
    return steps;
  }
  
  private generateGeneralSteps(intent: UserIntent, tools: AnyDeclarativeTool[], context: Content[]): ExecutionStep[] {
    // For general intents, return a simple step with the first available tool
    if (tools.length > 0) {
      return [{
        tool: tools[0],
        parameters: {},
        expectedOutcome: "The requested action will be performed",
        priority: 5
      }];
    }
    return [];
  }
}