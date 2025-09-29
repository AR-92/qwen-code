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

export const personaCommand: SlashCommand = {
  name: 'persona',
  description: 'Manage AI personas',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    {
      name: 'save',
      description: 'Save a persona',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const [name, ...contentParts] = args.trim().split(' ');
        const systemPrompt = contentParts.join(' ');

        if (!name || !systemPrompt) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /persona save <name> <systemPrompt>',
          };
        }

        try {
          await promptService.savePersona(name, systemPrompt);
          return {
            type: 'message',
            messageType: 'info',
            content: `Persona "${name}" saved successfully`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error saving persona: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'list',
      description: 'List all personas',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext) => {
        try {
          const personas = await promptService.listPersonas();
          if (personas.length === 0) {
            return {
              type: 'message',
              messageType: 'info',
              content: 'No personas found',
            };
          }

          const list = personas.map(p => `- ${p.name}: ${p.description || 'No description'}`).join('\n');
          return {
            type: 'message',
            messageType: 'info',
            content: `Personas:\n${list}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error listing personas: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'set',
      description: 'Set the current persona',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /persona set <name>',
          };
        }

        try {
          const persona = await promptService.getPersona(name);
          if (!persona) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Persona "${name}" not found`,
            };
          }

          // Create a temporary file with the system prompt
          const tempDir = path.join(os.tmpdir(), 'qwen-system-prompts');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const fileName = `system-prompt-${Date.now()}-${name}.md`;
          const tempFilePath = path.join(tempDir, fileName);
          fs.writeFileSync(tempFilePath, persona.systemPrompt);
          
          // Set the system prompt in the environment
          process.env['GEMINI_SYSTEM_MD'] = tempFilePath;
          
          return {
            type: 'message',
            messageType: 'info',
            content: `Persona "${name}" set as current. System prompt saved to: ${tempFilePath}\nNote: This change will only affect new qwen sessions.`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error setting persona: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'edit',
      description: 'Edit a persona in nvim',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /persona edit <name>',
          };
        }

        try {
          const persona = await promptService.getPersona(name);
          if (!persona) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Persona "${name}" not found`,
            };
          }

          // Create a temporary file with the persona's system prompt
          const tempDir = path.join(os.tmpdir(), 'qwen-personas');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          const tempFilePath = path.join(tempDir, `${persona.id}.md`);
          fs.writeFileSync(tempFilePath, persona.systemPrompt);

          // Launch nvim
          const child = spawn('nvim', [tempFilePath], { 
            stdio: 'inherit',
            env: { ...process.env }
          });

          child.on('close', async (code) => {
            if (code === 0) {
              // Read the modified content and update the persona
              const updatedSystemPrompt = fs.readFileSync(tempFilePath, 'utf-8');
              await promptService.updatePersona(persona.id, {
                systemPrompt: updatedSystemPrompt,
                updatedAt: new Date()
              });
              
              context.ui.addItem({
                type: 'info',
                text: `Persona "${name}" updated successfully`
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
            content: `Editing persona "${name}" in nvim...`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error editing persona: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'get',
      description: 'Get a persona',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /persona get <name>',
          };
        }

        try {
          const persona = await promptService.getPersona(name);
          if (!persona) {
            return {
              type: 'message',
              messageType: 'error',
              content: `Persona "${name}" not found`,
            };
          }

          return {
            type: 'message',
            messageType: 'info',
            content: `Persona: ${persona.name}\nSystem Prompt:\n${persona.systemPrompt}`,
          };
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error getting persona: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    },
    {
      name: 'delete',
      description: 'Delete a persona',
      kind: CommandKind.BUILT_IN,
      action: async (context: CommandContext, args: string) => {
        const name = args.trim();
        if (!name) {
          return {
            type: 'message',
            messageType: 'error',
            content: 'Usage: /persona delete <name>',
          };
        }

        try {
          const deleted = await promptService.deletePersona(name);
          if (deleted) {
            return {
              type: 'message',
              messageType: 'info',
              content: `Persona "${name}" deleted successfully`,
            };
          } else {
            return {
              type: 'message',
              messageType: 'error',
              content: `Persona "${name}" not found`,
            };
          }
        } catch (error) {
          return {
            type: 'message',
            messageType: 'error',
            content: `Error deleting persona: ${error instanceof Error ? error.message : String(error)}`,
          };
        }
      },
    }
  ],
  action: async (context: CommandContext, args: string) => {
    // Default action when just /persona is used
    const helpText = `Persona management commands:\n` +
      `/persona save <name> <systemPrompt> - Save a persona\n` +
      `/persona list - List all personas\n` +
      `/persona set <name> - Set the current persona\n` +
      `/persona edit <name> - Edit a persona in nvim\n` +
      `/persona get <name> - Get a persona\n` +
      `/persona delete <name> - Delete a persona`;
    
    return {
      type: 'message',
      messageType: 'info',
      content: helpText,
    };
  },
};