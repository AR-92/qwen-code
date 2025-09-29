/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { spawn } from 'node:child_process';
import type { TaskChain, TaskDefinition, TaskCondition } from './prompt-models.js';

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
}

export interface TaskChainExecutionResult {
  chainId: string;
  success: boolean;
  results: TaskExecutionResult[];
  executionTime: number;
}

export class TaskExecutionEngine {
  /**
   * Execute a task chain with conditional logic
   */
  async executeChain(chain: TaskChain, context: Record<string, any> = {}): Promise<TaskChainExecutionResult> {
    const startTime = Date.now();
    const results: TaskExecutionResult[] = [];
    
    try {
      // Start with the first task
      let currentTaskId: string | undefined = chain.startTaskId;
      const tasksMap = new Map(chain.tasks.map(task => [task.id, task]));
      
      while (currentTaskId) {
        const task = tasksMap.get(currentTaskId);
        if (!task) {
          throw new Error(`Task with ID ${currentTaskId} not found in chain`);
        }
        
        // Execute the current task
        const result = await this.executeTask(task, context);
        results.push(result);
        
        // Determine the next task based on the result
        if (result.success) {
          currentTaskId = task.onSuccess || chain.defaultOnSuccess;
        } else {
          currentTaskId = task.onFailure || chain.defaultOnFailure;
        }
      }
      
      const executionTime = Date.now() - startTime;
      const success = results.length > 0 && results[results.length - 1].success;
      
      return {
        chainId: chain.id,
        success,
        results,
        executionTime
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        chainId: chain.id,
        success: false,
        results,
        executionTime
      };
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(task: TaskDefinition, context: Record<string, any>): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Substitute variables in the command and arguments
      const substitutedCommand = this.substituteVariables(task.command, { ...context, ...task.variables });
      const substitutedArgs = task.args?.map(arg => this.substituteVariables(arg, { ...context, ...task.variables })) || [];
      
      // Create a promise that resolves when the command completes
      return new Promise<TaskExecutionResult>((resolve, reject) => {
        let output = '';
        let errorOutput = '';
        
        // Spawn the command
        const process = spawn(substitutedCommand, substitutedArgs, {
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Handle input if provided
        if (task.input) {
          const substitutedInput = this.substituteVariables(task.input, { ...context, ...task.variables });
          process.stdin.write(substitutedInput);
          process.stdin.end();
        }
        
        // Capture output
        process.stdout.on('data', (data) => {
          output += (data && typeof data.toString === 'function') ? data.toString() : '';
        });
        
        process.stderr.on('data', (data) => {
          errorOutput += (data && typeof data.toString === 'function') ? data.toString() : '';
        });
        
        // Handle process completion
        process.on('close', (code) => {
          const executionTime = Date.now() - startTime;
          
          const result: TaskExecutionResult = {
            taskId: task.id,
            success: code === 0,
            output: output.trim(),
            exitCode: code ?? undefined,
            executionTime
          };
          
          if (errorOutput) {
            result.error = errorOutput.trim();
          }
          
          resolve(result);
        });
        
        process.on('error', (err) => {
          const executionTime = Date.now() - startTime;
          
          resolve({
            taskId: task.id,
            success: false,
            output: '',
            error: err.message,
            executionTime
          });
        });
        
        // Handle timeout if specified
        if (task.timeout) {
          setTimeout(() => {
            try {
              process.kill();
            } catch (e) {
              // Process might have already exited
            }
            
            const executionTime = Date.now() - startTime;
            
            resolve({
              taskId: task.id,
              success: false,
              output: output.trim(),
              error: `Task timed out after ${task.timeout}ms`,
              executionTime
            });
          }, task.timeout);
        }
      });
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        taskId: task.id,
        success: false,
        output: '',
        error: (error as Error).message,
        executionTime
      };
    }
  }

  /**
   * Check if a task's conditions are met
   */
  async checkConditions(task: TaskDefinition, previousResults: TaskExecutionResult[]): Promise<boolean> {
    if (!task.conditions || task.conditions.length === 0) {
      // If no conditions, the task can proceed
      return true;
    }
    
    // Check if all conditions are met (AND logic by default)
    for (const condition of task.conditions) {
      const conditionMet = await this.evaluateCondition(condition, previousResults);
      if (!conditionMet) {
        return false; // All conditions must be true for AND logic
      }
    }
    
    return true;
  }

  /**
   * Check if a task's conditions are met with support for AND/OR logic
   */
  async checkConditionsAdvanced(task: TaskDefinition, previousResults: TaskExecutionResult[]): Promise<boolean> {
    if (!task.conditions || task.conditions.length === 0) {
      // If no conditions, the task can proceed
      return true;
    }
    
    // Check if it's OR logic (any condition can pass)
    if (task.conditions.length === 1) {
      return await this.evaluateCondition(task.conditions[0], previousResults);
    }
    
    // Default to AND logic (all conditions must pass)
    for (const condition of task.conditions) {
      const conditionMet = await this.evaluateCondition(condition, previousResults);
      if (!conditionMet) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(condition: TaskCondition, previousResults: TaskExecutionResult[]): Promise<boolean> {
    switch (condition.type) {
      case 'success':
        // Check if the last task was successful
        if (previousResults.length === 0) return false;
        return previousResults[previousResults.length - 1].success;
      
      case 'failure':
        // Check if the last task failed
        if (previousResults.length === 0) return false;
        return !previousResults[previousResults.length - 1].success;
      
      case 'output_contains':
        // Check if the last task's output contains a specific string
        if (previousResults.length === 0 || typeof condition.value !== 'string') return false;
        return previousResults[previousResults.length - 1].output.includes(condition.value);
      
      case 'output_matches':
        // Check if the last task's output matches a regex pattern
        if (previousResults.length === 0 || typeof condition.value !== 'string') return false;
        try {
          const regex = new RegExp(condition.value);
          return regex.test(previousResults[previousResults.length - 1].output);
        } catch (e) {
          console.error('Invalid regex pattern:', condition.value);
          return false;
        }
      
      case 'exit_code':
        // Check if the last task's exit code matches the expected value
        if (previousResults.length === 0 || typeof condition.value !== 'number') return false;
        return previousResults[previousResults.length - 1].exitCode === condition.value;
      
      case 'file_exists':
        if (typeof condition.target !== 'string') return false;
        try {
          const fs = await import('node:fs');
          return fs.existsSync(condition.target);
        } catch (e) {
          console.error('Could not check file existence:', condition.target);
          return false;
        }
      
      case 'file_not_exists':
        if (typeof condition.target !== 'string') return false;
        try {
          const fs = await import('node:fs');
          return !fs.existsSync(condition.target);
        } catch (e) {
          console.error('Could not check file non-existence:', condition.target);
          return false;
        }
      
      default:
        console.warn(`Unknown condition type: ${(condition as any).type}`);
        return false;
    }
  }

  /**
   * Replace variables in content with their values from context
   */
  private substituteVariables(content: string, variables: Record<string, string> = {}): string {
    let result = content;
    
    for (const [key, value] of Object.entries(variables)) {
      // Replace both {{key}} and ${key} patterns
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), value);
    }
    
    return result;
  }
}