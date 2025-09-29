/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptService } from './prompt-service.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';

// Mock UUID to have predictable values during testing
vi.mock('uuid', async () => {
  const actual = await vi.importActual('uuid');
  return {
    ...actual,
    v4: () => 'test-uuid-1234-5678-9012-testuuid',
  };
});

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    unlinkSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/mock/home'),
}));

describe('PromptService', () => {
  let promptService: PromptService;
  const mockHomeDir = '/mock/home';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(homedir).mockReturnValue(mockHomeDir);
    promptService = new PromptService();
  });

  describe('savePromptTemplate', () => {
    it('should save a prompt template correctly', async () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      // Mock directory existence checks to return false initially, then true after mkdir
      mockExistsSync.mockImplementation((dirPath: unknown) => {
        // Convert PathLike to string for comparison
        const pathString = typeof dirPath === 'string' ? dirPath : path.join('', dirPath as any);
        // Return true for the expected directories to avoid creating them in tests
        return [
          path.join(mockHomeDir, '.qwen'),
          path.join(mockHomeDir, '.qwen', 'prompts'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'templates'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'personas'),
          path.join(mockHomeDir, '.qwen', 'chains'),
        ].includes(pathString);
      });

      const result = await promptService.savePromptTemplate(
        'test-template',
        'This is a test template with {{variable}}',
        'A test description',
        ['test', 'example']
      );

      expect(result).toEqual({
        id: 'test-uuid-1234-5678-9012-testuuid',
        name: 'test-template',
        content: 'This is a test template with {{variable}}',
        description: 'A test description',
        createdAt: mockDate,
        updatedAt: mockDate,
        tags: ['test', 'example'],
        variables: ['variable'],
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prompts/templates/test-template.json'),
        JSON.stringify(result, null, 2)
      );

      vi.useRealTimers();
    });

    it('should throw an error when name or content is missing', async () => {
      await expect(promptService.savePromptTemplate('', 'content'))
        .rejects
        .toThrow('Name and content are required for prompt templates');
        
      await expect(promptService.savePromptTemplate('name', ''))
        .rejects
        .toThrow('Name and content are required for prompt templates');
    });
  });

  describe('getPromptTemplate', () => {
    it('should return null if template does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = await promptService.getPromptTemplate('nonexistent');
      expect(result).toBeNull();
    });

    it('should return template if it exists', async () => {
      const mockTemplate = {
        id: 'test-uuid-1234-5678-9012-testuuid',
        name: 'existing-template',
        content: 'Template content',
        description: 'Description',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        tags: ['test'],
        variables: ['var'],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockTemplate));

      const result = await promptService.getPromptTemplate('existing-template');

      expect(result).toEqual({
        ...mockTemplate,
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-01T00:00:00.000Z'),
      });
    });
  });

  describe('savePersona', () => {
    it('should save a persona correctly', async () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      mockExistsSync.mockImplementation((dirPath: unknown) => {
        // Convert PathLike to string for comparison
        const pathString = typeof dirPath === 'string' ? dirPath : path.join('', dirPath as any);
        return [
          path.join(mockHomeDir, '.qwen'),
          path.join(mockHomeDir, '.qwen', 'prompts'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'templates'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'personas'),
          path.join(mockHomeDir, '.qwen', 'chains'),
        ].includes(pathString);
      });

      const result = await promptService.savePersona(
        'test-persona',
        'System prompt for test persona',
        'A test persona',
        { theme: 'dark', language: 'en' }
      );

      expect(result).toEqual({
        id: 'test-uuid-1234-5678-9012-testuuid',
        name: 'test-persona',
        systemPrompt: 'System prompt for test persona',
        description: 'A test persona',
        createdAt: mockDate,
        updatedAt: mockDate,
        settings: { theme: 'dark', language: 'en' },
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('prompts/personas/test-persona.json'),
        JSON.stringify(result, null, 2)
      );

      vi.useRealTimers();
    });

    it('should throw an error when name or systemPrompt is missing', async () => {
      await expect(promptService.savePersona('', 'systemPrompt'))
        .rejects
        .toThrow('Name and systemPrompt are required for personas');
        
      await expect(promptService.savePersona('name', ''))
        .rejects
        .toThrow('Name and systemPrompt are required for personas');
    });
  });

  describe('saveTaskChain', () => {
    it('should save a task chain correctly', async () => {
      const mockDate = new Date('2023-01-01T00:00:00.000Z');
      vi.useFakeTimers();
      vi.setSystemTime(mockDate);

      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      mockExistsSync.mockImplementation((dirPath: unknown) => {
        // Convert PathLike to string for comparison
        const pathString = typeof dirPath === 'string' ? dirPath : path.join('', dirPath as any);
        return [
          path.join(mockHomeDir, '.qwen'),
          path.join(mockHomeDir, '.qwen', 'prompts'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'templates'),
          path.join(mockHomeDir, '.qwen', 'prompts', 'personas'),
          path.join(mockHomeDir, '.qwen', 'chains'),
        ].includes(pathString);
      });

      const mockTasks = [
        {
          id: 'task1',
          name: 'First Task',
          description: 'Description for first task',
          command: 'echo test',
        },
      ];

      const result = await promptService.saveTaskChain(
        'test-chain',
        mockTasks,
        'task1',
        'A test task chain',
        ['test', 'chain'],
        { contextValue: 'test' }
      );

      expect(result).toEqual({
        id: 'test-uuid-1234-5678-9012-testuuid',
        name: 'test-chain',
        description: 'A test task chain',
        createdAt: mockDate,
        updatedAt: mockDate,
        tags: ['test', 'chain'],
        tasks: mockTasks,
        startTaskId: 'task1',
        context: { contextValue: 'test' },
      });

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('chains/test-chain.json'),
        JSON.stringify(result, null, 2)
      );

      vi.useRealTimers();
    });

    it('should throw an error when name or tasks are missing or invalid', async () => {
      await expect(promptService.saveTaskChain('', [], 'task1'))
        .rejects
        .toThrow('Name and at least one task are required for task chains');
        
      await expect(promptService.saveTaskChain('name', [], 'task1'))
        .rejects
        .toThrow('Name and at least one task are required for task chains');
        
      await expect(promptService.saveTaskChain('name', [{ id: 'task2', name: 'Task', description: 'Desc', command: 'echo test' }], 'task1'))
        .rejects
        .toThrow('Start task ID task1 not found in task definitions');
    });
  });

  describe('extractVariables', () => {
    it('should extract variables in {{variable}} format', () => {
      const content = 'Hello {{name}}, welcome to {{place}}!';
      const result = promptService['extractVariables'](content);
      expect(result).toEqual(['name', 'place']);
    });

    it('should extract variables in ${variable} format', () => {
      const content = 'Hello ${user}, your score is ${score}';
      const result = promptService['extractVariables'](content);
      expect(result).toEqual(['user', 'score']);
    });

    it('should extract mixed variable formats', () => {
      const content = 'Hello {{name}}, your score is ${score} in ${place}';
      const result = promptService['extractVariables'](content);
      expect(result).toEqual(['name', 'score', 'place']);
    });

    it('should handle duplicate variables', () => {
      const content = 'Hello {{name}}, meet {{name}} in {{place}}';
      const result = promptService['extractVariables'](content);
      expect(result).toEqual(['name', 'place']);
    });

    it('should return empty array for content with no variables', () => {
      const content = 'Hello world, no variables here';
      const result = promptService['extractVariables'](content);
      expect(result).toEqual([]);
    });
  });
});