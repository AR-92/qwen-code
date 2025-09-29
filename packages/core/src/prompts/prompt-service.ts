/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import type {
  PromptTemplate,
  Persona,
  TaskChain,
  TaskDefinition
} from './prompt-models.js';

// Use a defensive approach to handle test environments where os module might not be properly mocked
function getHomedirSafe(): string {
  try {
    // Access os module dynamically to ensure it respects mocking
    const osModule = require('node:os') as typeof import('node:os');
    return osModule.homedir() || '/tmp/test-home';
  } catch (e) {
    // If os module is not available or homedir fails (e.g., in some test environments), use fallback
    return '/tmp/test-home';
  }
}

// Use lazy initialization to defer file system operations until actually needed
let directoriesInitialized = false;

function ensureDirectoriesExist() {
  if (directoriesInitialized) return;
  
  try {
    const homeDir = getHomedirSafe();
    const qwenDir = path.join(homeDir, '.qwen');
    const promptsDir = path.join(qwenDir, 'prompts');
    const templatesDir = path.join(promptsDir, 'templates');
    const personasDir = path.join(promptsDir, 'personas');
    const chainsDir = path.join(qwenDir, 'chains');

    // Ensure directories exist
    for (const dir of [qwenDir, promptsDir, templatesDir, personasDir, chainsDir]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    directoriesInitialized = true;
  } catch (error) {
    // In test environments, this may fail, but that's okay since
    // we'll handle the error in the actual methods
    console.debug('Could not ensure prompt directories exist, likely in test environment:', error);
  }
}

function getQwenDir(): string {
  return path.join(getHomedirSafe(), '.qwen');
}

function getPromptsDir(): string {
  return path.join(getQwenDir(), 'prompts');
}

function getTemplatesDir(): string {
  return path.join(getPromptsDir(), 'templates');
}

function getPersonasDir(): string {
  return path.join(getPromptsDir(), 'personas');
}

function getChainsDir(): string {
  return path.join(getHomedirSafe(), '.qwen', 'chains');
}

export class PromptService {
  /**
   * Save a new prompt template
   */
  async savePromptTemplate(name: string, content: string, description?: string, tags?: string[]): Promise<PromptTemplate> {
    ensureDirectoriesExist();
    
    // Validate inputs
    if (!name || !content) {
      throw new Error('Name and content are required for prompt templates');
    }

    // Generate a unique ID
    const id = uuidv4();
    
    const promptTemplate: PromptTemplate = {
      id,
      name,
      content,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags,
      variables: this.extractVariables(content)
    };

    // Save to file
    const filePath = path.join(getTemplatesDir(), `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(promptTemplate, null, 2));

    return promptTemplate;
  }

  /**
   * Get a prompt template by name
   */
  async getPromptTemplate(name: string): Promise<PromptTemplate | null> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getTemplatesDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = fs.readFileSync(filePath, 'utf-8');
      const template = JSON.parse(data) as PromptTemplate;
      
      // Ensure dates are properly converted
      template.createdAt = new Date(template.createdAt);
      template.updatedAt = new Date(template.updatedAt);
      
      return template;
    } catch (error) {
      console.error(`Error reading prompt template ${name}:`, error);
      return null;
    }
  }

  /**
   * List all prompt templates
   */
  async listPromptTemplates(): Promise<PromptTemplate[]> {
    ensureDirectoriesExist();
    try {
      const files = fs.readdirSync(getTemplatesDir());
      const templates: PromptTemplate[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const template = await this.getPromptTemplate(file.replace('.json', ''));
          if (template) {
            templates.push(template);
          }
        }
      }

      return templates;
    } catch (error) {
      console.error('Error listing prompt templates:', error);
      return [];
    }
  }

  /**
   * Update an existing prompt template
   */
  async updatePromptTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate | null> {
    ensureDirectoriesExist();
    try {
      // Find the template by ID (we need to list all to find by ID)
      const templates = await this.listPromptTemplates();
      const template = templates.find(t => t.id === id);
      
      if (!template) {
        return null;
      }

      // Update the template
      Object.assign(template, updates, { updatedAt: new Date() });

      // Save to file
      const filePath = path.join(getTemplatesDir(), `${template.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(template, null, 2));

      return template;
    } catch (error) {
      console.error(`Error updating prompt template ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a prompt template
   */
  async deletePromptTemplate(name: string): Promise<boolean> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getTemplatesDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting prompt template ${name}:`, error);
      return false;
    }
  }

  /**
   * Save a new persona
   */
  async savePersona(name: string, systemPrompt: string, description?: string, settings?: Record<string, any>): Promise<Persona> {
    ensureDirectoriesExist();
    // Validate inputs
    if (!name || !systemPrompt) {
      throw new Error('Name and systemPrompt are required for personas');
    }

    // Generate a unique ID
    const id = uuidv4();
    
    const persona: Persona = {
      id,
      name,
      systemPrompt,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings
    };

    // Save to file
    const filePath = path.join(getPersonasDir(), `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(persona, null, 2));

    return persona;
  }

  /**
   * Get a persona by name
   */
  async getPersona(name: string): Promise<Persona | null> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getPersonasDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = fs.readFileSync(filePath, 'utf-8');
      const persona = JSON.parse(data) as Persona;
      
      // Ensure dates are properly converted
      persona.createdAt = new Date(persona.createdAt);
      persona.updatedAt = new Date(persona.updatedAt);
      
      return persona;
    } catch (error) {
      console.error(`Error reading persona ${name}:`, error);
      return null;
    }
  }

  /**
   * List all personas
   */
  async listPersonas(): Promise<Persona[]> {
    ensureDirectoriesExist();
    try {
      const files = fs.readdirSync(getPersonasDir());
      const personas: Persona[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const persona = await this.getPersona(file.replace('.json', ''));
          if (persona) {
            personas.push(persona);
          }
        }
      }

      return personas;
    } catch (error) {
      console.error('Error listing personas:', error);
      return [];
    }
  }

  /**
   * Update an existing persona
   */
  async updatePersona(id: string, updates: Partial<Persona>): Promise<Persona | null> {
    ensureDirectoriesExist();
    try {
      // Find the persona by ID
      const personas = await this.listPersonas();
      const persona = personas.find(p => p.id === id);
      
      if (!persona) {
        return null;
      }

      // Update the persona
      Object.assign(persona, updates, { updatedAt: new Date() });

      // Save to file
      const filePath = path.join(getPersonasDir(), `${persona.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(persona, null, 2));

      return persona;
    } catch (error) {
      console.error(`Error updating persona ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a persona
   */
  async deletePersona(name: string): Promise<boolean> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getPersonasDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting persona ${name}:`, error);
      return false;
    }
  }

  /**
   * Save a new task chain
   */
  async saveTaskChain(name: string, tasks: TaskDefinition[], startTaskId: string, description?: string, tags?: string[], context?: Record<string, any>): Promise<TaskChain> {
    ensureDirectoriesExist();
    // Validate inputs
    if (!name || !tasks || tasks.length === 0) {
      throw new Error('Name and at least one task are required for task chains');
    }

    // Validate that startTaskId exists in tasks
    if (!tasks.some(task => task.id === startTaskId)) {
      throw new Error(`Start task ID ${startTaskId} not found in task definitions`);
    }

    // Generate a unique ID
    const id = uuidv4();
    
    const taskChain: TaskChain = {
      id,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags,
      tasks,
      startTaskId,
      context
    };

    // Save to file
    const filePath = path.join(getChainsDir(), `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(taskChain, null, 2));

    return taskChain;
  }

  /**
   * Get a task chain by name
   */
  async getTaskChain(name: string): Promise<TaskChain | null> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getChainsDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = fs.readFileSync(filePath, 'utf-8');
      const chain = JSON.parse(data) as TaskChain;
      
      // Ensure dates are properly converted
      chain.createdAt = new Date(chain.createdAt);
      chain.updatedAt = new Date(chain.updatedAt);
      
      return chain;
    } catch (error) {
      console.error(`Error reading task chain ${name}:`, error);
      return null;
    }
  }

  /**
   * List all task chains
   */
  async listTaskChains(): Promise<TaskChain[]> {
    ensureDirectoriesExist();
    try {
      const files = fs.readdirSync(getChainsDir());
      const chains: TaskChain[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const chain = await this.getTaskChain(file.replace('.json', ''));
          if (chain) {
            chains.push(chain);
          }
        }
      }

      return chains;
    } catch (error) {
      console.error('Error listing task chains:', error);
      return [];
    }
  }

  /**
   * Update an existing task chain
   */
  async updateTaskChain(id: string, updates: Partial<TaskChain>): Promise<TaskChain | null> {
    ensureDirectoriesExist();
    try {
      // Find the chain by ID
      const chains = await this.listTaskChains();
      const chain = chains.find(c => c.id === id);
      
      if (!chain) {
        return null;
      }

      // Update the chain
      Object.assign(chain, updates, { updatedAt: new Date() });

      // Save to file
      const filePath = path.join(getChainsDir(), `${chain.name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(chain, null, 2));

      return chain;
    } catch (error) {
      console.error(`Error updating task chain ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a task chain
   */
  async deleteTaskChain(name: string): Promise<boolean> {
    ensureDirectoriesExist();
    try {
      const filePath = path.join(getChainsDir(), `${name}.json`);
      if (!fs.existsSync(filePath)) {
        return false;
      }

      fs.unlinkSync(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting task chain ${name}:`, error);
      return false;
    }
  }



  /**
   * Extract variable names from content (in {{variable}} or ${variable} format)
   */
  private extractVariables(content: string): string[] {
    const regex = /\{\{(\w+)\}\}|\$\{(\w+)\}/g;
    const matches = [...content.matchAll(regex)];
    const variables = new Set<string>();
    
    for (const match of matches) {
      // The variable name is in either capture group 1 or 2
      const varName = match[1] || match[2];
      if (varName) {
        variables.add(varName);
      }
    }
    
    return Array.from(variables);
  }
}