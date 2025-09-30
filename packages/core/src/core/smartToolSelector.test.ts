/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SmartToolSelector } from './smartToolSelector.js';
import type { Content } from '@google/genai';
import type { AnyDeclarativeTool } from '../tools/tools.js';

// Mock tool class for testing
import { Kind } from '../tools/tools.js';

const createMockTool = (name: string, description: string): AnyDeclarativeTool => {
  const tool = {
    name,
    displayName: name.charAt(0).toUpperCase() + name.slice(1),
    description,
    kind: Kind.Other,
    parameterSchema: {},
    isOutputMarkdown: true,
    canUpdateOutput: false,
    get schema() {
      return {
        name: this.name,
        description: this.description,
        parametersJsonSchema: this.parameterSchema,
      };
    },
    validateToolParams: (params: any) => null, // Should return string | null, not boolean
    build: (params: any) => {
      // Return a mock ToolInvocation object
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
    }
  };
  
  // Add silentBuild property after creation to avoid TypeScript compatibility issue
  (tool as any).silentBuild = (params: any) => {
    try {
      // Return a mock ToolInvocation object similar to the build method
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
  };
  
  return tool as unknown as AnyDeclarativeTool;
};

describe('SmartToolSelector', () => {
  let toolSelector: SmartToolSelector;

  beforeEach(() => {
    toolSelector = new SmartToolSelector();
    
    // Register mock tools
    toolSelector.registerTool(createMockTool('read-file', 'Reads a file'));
    toolSelector.registerTool(createMockTool('edit', 'Edits a file'));
    toolSelector.registerTool(createMockTool('shell', 'Executes a shell command'));
  });

  it('should select optimal tools for code-change intent', async () => {
    const intent = {
      id: 'test',
      type: 'code-change' as const,
      targets: ['src/file.ts'],
      confidence: 0.9,
    };
    
    const context: Content[] = [];
    
    const tools = await toolSelector.selectOptimalTools(intent, context, 2);
    
    // Should prioritize edit tool for code changes
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].name).toBe('edit');
  });

  it('should select optimal tools for query intent', async () => {
    const intent = {
      id: 'test',
      type: 'query' as const,
      targets: ['src/file.ts'],
      confidence: 0.8,
    };
    
    const context: Content[] = [];
    
    const tools = await toolSelector.selectOptimalTools(intent, context, 2);
    
    // Should prioritize read tool for queries
    expect(tools.length).toBeGreaterThan(0);
    expect(tools[0].name).toBe('read-file');
  });

  it('should predict tool effectiveness correctly', async () => {
    const intent = {
      id: 'test',
      type: 'debug' as const,
      targets: ['src/app.js'],
      confidence: 0.7,
    };
    
    const context: Content[] = [{
      role: 'user',
      parts: [{ text: 'I need to run the tests to debug this issue' }]
    }];
    
    const predictions = await toolSelector.predictEffectiveTools(intent, context);
    
    expect(predictions.length).toBeGreaterThan(0);
    
    // Shell tool should have higher relevance due to context
    const shellToolPrediction = predictions.find(p => p.tool.name === 'shell');
    expect(shellToolPrediction).toBeDefined();
    expect(shellToolPrediction!.contextRelevance).toBeGreaterThanOrEqual(0.5);
  });

  it('should consider context relevance when selecting tools', async () => {
    const intent = {
      id: 'test',
      type: 'query' as const,
      targets: [],
      confidence: 0.7,
    };
    
    // Context mentions a specific file
    const context: Content[] = [{
      role: 'user',
      parts: [{ text: 'Can you show me the content of src/config.ts?' }]
    }];
    
    const tools = await toolSelector.selectOptimalTools(intent, context, 1);
    
    expect(tools[0].name).toBe('read-file');
  });
});