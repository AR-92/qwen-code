/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptService } from '@qwen-code/qwen-code-core';
import { TaskExecutionEngine } from '@qwen-code/qwen-code-core';
import type { SlashCommand } from './types.js';
import type { CommandContext } from './types.js';
import { CommandKind } from './types.js';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

const promptService = new PromptService();
const executionEngine = new TaskExecutionEngine();

export const chainCommand: SlashCommand = {
  name: 'chain',
  description: 'Manage task chains',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'create',
      description: 'Create a task chain',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const [name] = args.trim().split(' ');
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /chain create <name>',
          };
        }

        try {
          // Create a basic template for the task chain
          const template = {
            "tasks": [
              {
                "id": "task1",
                "name": "Example Task",
                "command": "echo",
                "args": ["Hello from task chain!"]
              }
            ],
            "startTaskId": "task1"
          };

          // Create a temporary file with the template
          const tempDir = path.join(os.tmpdir(), 'qwen-chains');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = path.join(tempDir, `${name}-template.json`);
          fs.writeFileSync(tempFilePath, JSON.stringify(template, null, 2));

          // Launch nvim to edit the template
          const child = spawn('nvim', [tempFilePath], { 
            stdio: 'inherit',
            env: { ...process.env }
          });

          child.on('close', async (code) => {
            if (code === 0) {
              // Read the modified content and save the chain
              const fileContent = fs.readFileSync(tempFilePath, 'utf-8');
              try {
                const chainDefinition = JSON.parse(fileContent);
                
                if (!chainDefinition.tasks || !Array.isArray(chainDefinition.tasks) || chainDefinition.tasks.length === 0) {
                  context.ui.addItem({
                    type: 'error',
                    text: 'Invalid chain definition: must include a non-empty tasks array'
                  }, Date.now());
                } else if (!chainDefinition.startTaskId) {
                  context.ui.addItem({
                    type: 'error',
                    text: 'Invalid chain definition: must include a startTaskId'
                  }, Date.now());
                } else {
                  await promptService.saveTaskChain(
                    name, 
                    chainDefinition.tasks, 
                    chainDefinition.startTaskId, 
                    chainDefinition.description, 
                    chainDefinition.tags, 
                    chainDefinition.context
                  );
                  
                  context.ui.addItem({
                    type: 'info',
                    text: `Task chain "${name}" created successfully`
                  }, Date.now());
                }
              } catch (parseError) {
                context.ui.addItem({
                  type: 'error',
                  text: `Error parsing chain definition: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                }, Date.now());
              }
            } else {
              context.ui.addItem({
                type: 'info',
                text: 'Editor closed without saving changes'
              }, Date.now());
            }
            
            // Clean up temp file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (e) {
              // Ignore cleanup errors
            }
          });

          return {
            type: 'message',
            messageType: 'info',
            content: `Creating task chain "${name}" in nvim...`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error creating chain: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'list',
      description: 'List all task chains',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        try {
          const chains = await promptService.listTaskChains();
          if (chains.length === 0) {
            return {
              type: 'message',
              messageType: 'info',
              content: 'No task chains found',
            };
          }

          const list = chains.map(c => `- ${c.name}: ${c.description || 'No description'} (${c.tasks.length} tasks)`).join('\n');
          return {
            type: 'message',
            messageType: 'info',
            content: `Task Chains:\n${list}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error listing chains: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'edit',
      description: 'Edit a task chain in nvim',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /chain edit <name>',
          };
        }

        try {
          const chain = await promptService.getTaskChain(name);
          if (!chain) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Task chain "${name}" not found`,
            };
          }

          // Create a temporary file with the chain definition
          const tempDir = path.join(os.tmpdir(), 'qwen-chains');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = path.join(tempDir, `${chain.id}.json`);
          fs.writeFileSync(tempFilePath, JSON.stringify(chain, null, 2));

          // Launch nvim
          const child = spawn('nvim', [tempFilePath], { 
            stdio: 'inherit',
            env: { ...process.env }
          });

          child.on('close', async (code) => {
            if (code === 0) {
              // Read the modified content and update the chain
              const fileContent = fs.readFileSync(tempFilePath, 'utf-8');
              try {
                const updatedChain = JSON.parse(fileContent);
                
                await promptService.updateTaskChain(chain.id, updatedChain);
                
                context.ui.addItem({
                  type: 'info',
                  text: `Task chain "${name}" updated successfully`
                }, Date.now());
              } catch (parseError) {
                context.ui.addItem({
                  type: 'error',
                  text: `Error parsing updated chain definition: ${parseError instanceof Error ? parseError.message : String(parseError)}`
                }, Date.now());
              }
            } else {
              context.ui.addItem({
                type: 'info',
                text: 'Editor closed without saving changes'
              }, Date.now());
            }
            
            // Clean up temp file
            try {
              fs.unlinkSync(tempFilePath);
            } catch (e) {
              // Ignore cleanup errors
            }
          });

          return {
            type: 'message',
            messageType: 'info',
            content: `Editing task chain "${name}" in nvim...`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error editing chain: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'get',
      description: 'Get a task chain',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /chain get <name>',
          };
        }

        try {
          const chain = await promptService.getTaskChain(name);
          if (!chain) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Task chain "${name}" not found`,
            };
          }

          return {
            type: 'message',
            messageType: 'info',
            content: `Task Chain: ${chain.name}\n${JSON.stringify(chain, null, 2)}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error getting chain: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'delete',
      description: 'Delete a task chain',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /chain delete <name>',
          };
        }

        try {
          const deleted = await promptService.deleteTaskChain(name);
          if (deleted) {
            return {
              type: 'message',
              messageType: 'info',
              content: `Task chain "${name}" deleted successfully`,
            };
          } else {
            return {
              type: 'message',
              messageType: 'error',
              content: `Task chain "${name}" not found`,
            };
          }
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error deleting chain: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'run',
      description: 'Run a task chain',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const [name] = args.trim().split(' ');
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /chain run <name>',
          };
        }

        try {
          const chain = await promptService.getTaskChain(name);
          if (!chain) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Task chain "${name}" not found`,
            };
          }

          // Run the chain
          context.ui.addItem({
            type: 'info',
            text: `Executing task chain: ${name}`
          }, Date.now());
          
          const result = await executionEngine.executeChain(chain);
          
          const statusMessage = `Execution completed in ${result.executionTime}ms. Overall success: ${result.success}`;
          context.ui.addItem({
            type: 'info',
            text: statusMessage
          }, Date.now());
          
          for (const taskResult of result.results) {
            const taskMessage = `Task: ${taskResult.taskId} - Success: ${taskResult.success} - Execution time: ${taskResult.executionTime}ms`;
            context.ui.addItem({
              type: 'info',
              text: taskMessage
            }, Date.now());
            
            if (taskResult.error) {
              context.ui.addItem({
                type: 'error',
                text: `Error: ${taskResult.error}`
              }, Date.now());
            }
            
            // Limit output length to prevent too much clutter
            const output = taskResult.output.substring(0, 500);
            if (output.length > 0) {
              context.ui.addItem({
                type: 'info',
                text: `Output: ${output}${taskResult.output.length > 500 ? '...' : ''}`
              }, Date.now());
            }
          }

          return {
            type: 'message',
            messageType: 'info',
            content: `Task chain execution completed.`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error running chain: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }
  ],
  action: async (context: CommandContext, args: string) => {
    // Default action when just /chain is used
    const helpText = `Task chain management commands:\n` +
      `/chain create <name> - Create a task chain in nvim\n` +
      `/chain list - List all task chains\n` +
      `/chain edit <name> - Edit a task chain in nvim\n` +
      `/chain get <name> - Get a task chain\n` +
      `/chain delete <name> - Delete a task chain\n` +
      `/chain run <name> - Run a task chain`;
    
    return {
      type: 'message',
      messageType: 'info',
      content: helpText,
    };
  },
};