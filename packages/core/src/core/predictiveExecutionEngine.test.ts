/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PredictiveExecutionEngine } from './predictiveExecutionEngine.js';
import { EnhancedContextManager } from './enhancedContextManager.js';
import type { Content } from '@google/genai';

// Mock tool for testing
class MockTool {
  name = 'test-tool';
  constructor(public id: string) {}
  
  async execute(params: any, context: any): Promise<any> {
    return `Executed ${this.id} with ${JSON.stringify(params)}`;
  }
}

describe('PredictiveExecutionEngine', () => {
  let executionEngine: PredictiveExecutionEngine;
  let contextManager: EnhancedContextManager;

  beforeEach(() => {
    contextManager = new EnhancedContextManager();
    executionEngine = new PredictiveExecutionEngine(contextManager);
  });

  it('should predict execution plan for code-change intent', async () => {
    const userInput = 'I need to modify the user authentication function';
    const context: Content[] = [{
      role: 'user',
      parts: [{ text: 'The current login function is in src/services/auth.js' }]
    }];
    
    const plan = await executionEngine.predictExecutionPlan(userInput, context);
    
    expect(plan).toBeDefined();
    expect(plan.predictedIntent.type).toBe('code-change');
    expect(plan.executionSteps.length).toBeGreaterThan(0);
    expect(plan.confidence).toBeGreaterThan(0);
    expect(plan.predictedOutcome).toContain('Code will be modified');
  });

  it('should predict execution plan for query intent', async () => {
    const userInput = 'Show me the user model definition';
    const context: Content[] = [];
    
    const plan = await executionEngine.predictExecutionPlan(userInput, context);
    
    expect(plan.predictedIntent.type).toBe('query');
    expect(plan.executionSteps.length).toBeGreaterThan(0);
    expect(plan.predictedOutcome).toContain('Information will be retrieved');
  });

  it('should execute with prediction successfully', async () => {
    const userInput = 'Read the README file to understand the project';
    const context: Content[] = [];
    
    // Mock the tool selection to return a mock tool
    vi.spyOn(executionEngine['toolSelector'], 'selectOptimalTools').mockResolvedValue([
      new MockTool('readme-reader')
    ] as any);
    
    const results = await executionEngine.executeWithPrediction(userInput, context);
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should calculate prediction confidence appropriately', async () => {
    const userInput = 'Fix the bug in the login service';
    const context: Content[] = [];
    
    const plan = await executionEngine.predictExecutionPlan(userInput, context);
    
    expect(plan.confidence).toBeGreaterThanOrEqual(0);
    expect(plan.confidence).toBeLessThanOrEqual(1);
  });
});