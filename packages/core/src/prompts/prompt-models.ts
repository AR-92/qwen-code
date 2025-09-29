/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Represents a stored prompt template with metadata
 */
export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  variables?: string[]; // Variables that can be substituted in the prompt
}

/**
 * Represents a persona with system prompt and settings
 */
export interface Persona {
  id: string;
  name: string;
  systemPrompt: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  settings?: Record<string, any>; // Additional settings specific to this persona
}

/**
 * Represents a condition for task execution in a chain
 */
export interface TaskCondition {
  type: 'success' | 'failure' | 'output_contains' | 'output_matches' | 'exit_code' | 'file_exists' | 'file_not_exists';
  value?: string | number | boolean; // Value to compare against
  target?: string; // Target for file operations or output patterns
}

/**
 * Represents a single task in a chain
 */
export interface TaskDefinition {
  id: string;
  name: string;
  description?: string;
  command: string; // The command to execute
  args?: string[]; // Arguments for the command
  input?: string; // Input to provide to the command
  expectedOutput?: string; // Expected output pattern
  conditions?: TaskCondition[]; // Conditions that must be met to execute this task
  onSuccess?: string; // Next task ID to execute on success
  onFailure?: string; // Next task ID to execute on failure
  timeout?: number; // Maximum time to wait for task completion (in milliseconds)
  retryCount?: number; // Number of times to retry on failure
  variables?: Record<string, string>; // Variables to substitute in command/args
}

/**
 * Represents a chain of tasks with conditional execution
 */
export interface TaskChain {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  tasks: TaskDefinition[];
  startTaskId: string; // ID of the first task to execute
  defaultOnSuccess?: string; // Default next task ID on success (if not specified per task)
  defaultOnFailure?: string; // Default next task ID on failure (if not specified per task)
  context?: Record<string, any>; // Shared context available to all tasks in the chain
}