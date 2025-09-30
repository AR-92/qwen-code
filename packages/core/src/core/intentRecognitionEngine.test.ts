/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntentRecognitionEngine } from './intentRecognitionEngine.js';
import type { Content } from '@google/genai';

describe('IntentRecognitionEngine', () => {
  let intentEngine: IntentRecognitionEngine;

  beforeEach(() => {
    intentEngine = new IntentRecognitionEngine();
  });

  it('should classify code-change intent correctly', async () => {
    const userInput = 'I need to modify the authentication function to add password validation';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.type).toBe('code-change');
    expect(intent.confidence).toBeGreaterThan(0.6);
    expect(intent.targets).toContain('auth');
  });

  it('should classify query intent correctly', async () => {
    const userInput = 'What does the User model look like in the database?';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.type).toBe('query');
    expect(intent.confidence).toBeGreaterThan(0.6);
  });

  it('should classify debug intent correctly', async () => {
    const userInput = 'I\'m getting an error when trying to login. The error says "invalid token"';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.type).toBe('debug');
    expect(intent.confidence).toBeGreaterThan(0.6);
  });

  it('should classify refactor intent correctly', async () => {
    const userInput = 'I want to improve the performance of the data access layer by making it more efficient';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.type).toBe('refactor');
    expect(intent.confidence).toBeGreaterThan(0.6);
  });

  it('should extract file targets from user input', async () => {
    const userInput = 'I need to fix a bug in src/services/authService.js and src/components/LoginForm.tsx';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.targets).toContain('src/services/authService.js');
    expect(intent.targets).toContain('src/components/LoginForm.tsx');
  });

  it('should predict outcome for user request', async () => {
    const userInput = 'Implement OAuth2 authentication with Google';
    const context: Content[] = [];
    
    const intent = await intentEngine.predictIntent(userInput, context);
    
    expect(intent.expectedOutcome).toBeDefined();
    expect(intent.expectedOutcome).toContain('Added new functionality');
  });
});