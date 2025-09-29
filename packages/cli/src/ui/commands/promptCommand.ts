/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { PromptService } from '@qwen-code/qwen-code-core';
import type { SlashCommand } from './types.js';
import type { CommandContext } from './types.js';
import { CommandKind } from './types.js';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';

const promptService = new PromptService();

export const promptCommand: SlashCommand = {
  name: 'prompt',
  description: 'Manage prompt templates',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'save',
      description: 'Save a prompt template',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const [name, ...contentParts] = args.trim().split(' ');
        const content = contentParts.join(' ');

        if (!name || !content) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /prompt save <name> <content>',
          };
        }

        try {
          await promptService.savePromptTemplate(name, content);
          return {
            type: 'message',
            messageType: 'info',
            content: `Prompt template "${name}" saved successfully`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error saving prompt: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'list',
      description: 'List all prompt templates',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        try {
          const templates = await promptService.listPromptTemplates();
          if (templates.length === 0) {
            return {
              type: 'message',
              messageType: 'info',
              content: 'No prompt templates found',
            };
          }

          const list = templates.map(t => `- ${t.name}: ${t.description || 'No description'}`).join('\n');
          return {
            type: 'message',
            messageType: 'info',
            content: `Prompt Templates:\n${list}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error listing prompts: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'edit',
      description: 'Edit a prompt template in nvim',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /prompt edit <name>',
          };
        }

        try {
          const template = await promptService.getPromptTemplate(name);
          if (!template) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Prompt template "${name}" not found`,
            };
          }

          // Create a temporary file with the prompt content
          const tempDir = path.join(os.tmpdir(), 'qwen-prompts');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = path.join(tempDir, `${template.id}.md`);
          fs.writeFileSync(tempFilePath, template.content);

          // Launch nvim
          const child = spawn('nvim', [tempFilePath], { 
            stdio: 'inherit',
            env: { ...process.env }
          });

          child.on('close', async (code) => {
            if (code === 0) {
              // Read the modified content and update the template
              const updatedContent = fs.readFileSync(tempFilePath, 'utf-8');
              await promptService.updatePromptTemplate(template.id, {
                content: updatedContent,
                updatedAt: new Date()
              });
              
              context.ui.addItem({
                type: 'info',
                text: `Prompt template "${name}" updated successfully`
              }, Date.now());
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
            content: `Editing prompt "${name}" in nvim...`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error editing prompt: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'get',
      description: 'Get a prompt template',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /prompt get <name>',
          };
        }

        try {
          const template = await promptService.getPromptTemplate(name);
          if (!template) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Prompt template "${name}" not found`,
            };
          }

          return {
            type: 'message',
            messageType: 'info',
            content: `Prompt Template: ${template.name}\nContent:\n${template.content}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error getting prompt: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'delete',
      description: 'Delete a prompt template',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /prompt delete <name>',
          };
        }

        try {
          const deleted = await promptService.deletePromptTemplate(name);
          if (deleted) {
            return {
              type: 'message',
              messageType: 'info',
              content: `Prompt template "${name}" deleted successfully`,
            };
          } else {
            return {
              type: 'message',
              messageType: 'error',
              content: `Prompt template "${name}" not found`,
            };
          }
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error deleting prompt: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }
  ],
  action: async (context: CommandContext, args: string) => {
    // Default action when just /prompt is used
    const helpText = `Prompt management commands:\n` +
      `/prompt save <name> <content> - Save a prompt template\n` +
      `/prompt list - List all prompt templates\n` +
      `/prompt edit <name> - Edit a prompt template in nvim\n` +
      `/prompt get <name> - Get a prompt template\n` +
      `/prompt delete <name> - Delete a prompt template`;
    
    return {
      type: 'message',
      messageType: 'info',
      content: helpText,
    };
  },
};