/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command } from 'commander';
import { PromptService, TaskExecutionEngine } from '@qwen-code/qwen-code-core';
import type { TaskChain } from '@qwen-code/qwen-code-core';
import { spawn } from 'node:child_process';

const promptService = new PromptService();
const executionEngine = new TaskExecutionEngine();

export async function createChainCommand(): Promise<Command> {
  const chainCommand = new Command('chain')
    .description('Manage task chains');

  // Create a task chain command
  chainCommand
    .command('create')
    .description('Create a new task chain')
    .argument('<name>', 'Name for the task chain')
    .option('-d, --description <description>', 'Description for the chain')
    .option('-t, --tags <tags>', 'Comma-separated list of tags', (val) => val.split(','))
    .option('-f, --file <file>', 'File containing the chain definition in JSON format')
    .action(async (name, options) => {
      try {
        if (options.file) {
          // Create from file
          const fileContent = fs.readFileSync(options.file, 'utf-8');
          const chainDefinition = JSON.parse(fileContent);
          await createChainFromFile(name, chainDefinition, options.description, options.tags);
        } else {
          // Create interactively
          await createChainInteractively(name, options.description, options.tags);
        }
      } catch (error) {
        console.error('Error creating task chain:', error);
        process.exit(1);
      }
    });

  // List chains command
  chainCommand
    .command('list')
    .alias('ls')
    .description('List all saved task chains')
    .option('-t, --tag <tag>', 'Filter by tag')
    .action(async (options) => {
      try {
        const chains = await promptService.listTaskChains();
        
        if (options.tag) {
          const filtered = chains.filter(c => c.tags?.includes(options.tag));
          displayTaskChains(filtered);
        } else {
          displayTaskChains(chains);
        }
      } catch (error) {
        console.error('Error listing task chains:', error);
        process.exit(1);
      }
    });

  // Edit chain command
  chainCommand
    .command('edit')
    .description('Edit a task chain in nvim')
    .argument('<name>', 'Name of the task chain to edit')
    .option('-e, --editor <editor>', 'Editor to use (default: nvim)', 'nvim')
    .action(async (name, options) => {
      try {
        const chain = await promptService.getTaskChain(name);
        if (!chain) {
          console.error(`Task chain "${name}" not found`);
          process.exit(1);
        }

        // Create a temporary file with the chain definition
        const tempDir = path.join(os.tmpdir(), 'qwen-chains');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `${chain.id}.json`);
        fs.writeFileSync(tempFilePath, JSON.stringify(chain, null, 2));

        // Launch the editor
        const editor = options.editor || 'nvim';
        const child = spawn(editor, [tempFilePath], { stdio: 'inherit' });

        child.on('close', async (code) => {
          if (code === 0) {
            // Read the modified content and update the chain
            const fileContent = fs.readFileSync(tempFilePath, 'utf-8');
            const updatedChain = JSON.parse(fileContent) as TaskChain;
            
            // Update the chain in the service
            const result = await promptService.updateTaskChain(chain.id, updatedChain);
            if (result) {
              console.log(`Task chain "${name}" updated successfully`);
            } else {
              console.error(`Error updating task chain "${name}"`);
              process.exit(1);
            }
          } else {
            console.log('Editor closed without saving changes');
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
        });
      } catch (error) {
        console.error('Error editing task chain:', error);
        process.exit(1);
      }
    });

  // Get chain command
  chainCommand
    .command('get')
    .description('Get a specific task chain')
    .argument('<name>', 'Name of the task chain to retrieve')
    .action(async (name) => {
      try {
        const chain = await promptService.getTaskChain(name);
        if (!chain) {
          console.error(`Task chain "${name}" not found`);
          process.exit(1);
        }
        
        console.log(JSON.stringify(chain, null, 2));
      } catch (error) {
        console.error('Error retrieving task chain:', error);
        process.exit(1);
      }
    });

  // Delete chain command
  chainCommand
    .command('delete')
    .alias('rm')
    .description('Delete a task chain')
    .argument('<name>', 'Name of the task chain to delete')
    .action(async (name) => {
      try {
        const deleted = await promptService.deleteTaskChain(name);
        if (deleted) {
          console.log(`Task chain "${name}" deleted successfully`);
        } else {
          console.error(`Task chain "${name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error deleting task chain:', error);
        process.exit(1);
      }
    });

  // Run chain command
  chainCommand
    .command('run')
    .description('Execute a task chain')
    .argument('<name>', 'Name of the task chain to execute')
    .option('-c, --context <context>', 'Additional context for the chain as JSON string')
    .action(async (name, options) => {
      try {
        const chain = await promptService.getTaskChain(name);
        if (!chain) {
          console.error(`Task chain "${name}" not found`);
          process.exit(1);
        }
        
        // Parse additional context if provided
        let context: Record<string, any> = {};
        if (options.context) {
          try {
            context = JSON.parse(options.context);
          } catch (e) {
            console.error('Invalid JSON for context:', options.context);
            process.exit(1);
          }
        }
        
        // Run the chain
        console.log(`Executing task chain: ${name}`);
        const result = await executionEngine.executeChain(chain, { ...chain.context, ...context });
        
        console.log(`\nExecution completed in ${result.executionTime}ms`);
        console.log(`Overall success: ${result.success}`);
        
        for (const taskResult of result.results) {
          console.log(`\nTask: ${taskResult.taskId}`);
          console.log(`  Success: ${taskResult.success}`);
          console.log(`  Execution time: ${taskResult.executionTime}ms`);
          if (taskResult.error) {
            console.log(`  Error: ${taskResult.error}`);
          }
          if (taskResult.exitCode !== undefined) {
            console.log(`  Exit code: ${taskResult.exitCode}`);
          }
          // Limit output length to prevent too much clutter
          const output = taskResult.output.substring(0, 500);
          if (output.length > 0) {
            console.log(`  Output: ${output}${taskResult.output.length > 500 ? '...' : ''}`);
          }
        }
      } catch (error) {
        console.error('Error running task chain:', error);
        process.exit(1);
      }
    });

  return chainCommand;
}

async function createChainFromFile(name: string, chainDefinition: any, description?: string, tags?: string[]): Promise<void> {
  try {
    // Validate the chain definition structure
    if (!chainDefinition.tasks || !Array.isArray(chainDefinition.tasks) || chainDefinition.tasks.length === 0) {
      throw new Error('Chain definition must include a non-empty tasks array');
    }
    
    if (!chainDefinition.startTaskId) {
      throw new Error('Chain definition must include a startTaskId');
    }
    
    await promptService.saveTaskChain(
      name, 
      chainDefinition.tasks, 
      chainDefinition.startTaskId, 
      description, 
      tags, 
      chainDefinition.context
    );
    
    console.log(`Task chain "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving task chain:', error);
    process.exit(1);
  }
}

async function createChainInteractively(name: string, description?: string, tags?: string[]): Promise<void> {
  console.log(`Creating task chain "${name}" interactively is not yet implemented.`);
  console.log(`Please create a JSON file with your task chain definition and use the --file option.`);
  console.log('\nExample chain definition format:');
  console.log(JSON.stringify({
    tasks: [
      {
        id: "task1",
        name: "First Task",
        command: "echo",
        args: ["hello", "world"],
        onSuccess: "task2",
        onFailure: "task3"
      },
      {
        id: "task2",
        name: "Second Task",
        command: "ls",
        args: ["-la"]
      },
      {
        id: "task3",
        name: "Error Handler",
        command: "echo",
        args: ["Something went wrong"]
      }
    ],
    startTaskId: "task1"
  }, null, 2));
}

function displayTaskChains(chains: TaskChain[]): void {
  if (chains.length === 0) {
    console.log('No task chains found');
    return;
  }

  console.log('Task Chains:');
  for (const chain of chains) {
    console.log(`\nName: ${chain.name}`);
    console.log(`ID: ${chain.id}`);
    if (chain.description) {
      console.log(`Description: ${chain.description}`);
    }
    if (chain.tags && chain.tags.length > 0) {
      console.log(`Tags: ${chain.tags.join(', ')}`);
    }
    console.log(`Tasks: ${chain.tasks.length} tasks`);
    console.log(`Start Task: ${chain.startTaskId}`);
    console.log(`Created: ${chain.createdAt.toLocaleDateString()}`);
    console.log(`Updated: ${chain.updatedAt.toLocaleDateString()}`);
    console.log('---');
  }
}