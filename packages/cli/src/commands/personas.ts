/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command } from 'commander';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { Persona } from '@qwen-code/qwen-code-core';
import { spawn } from 'node:child_process';

const promptService = new PromptService();

export async function createPersonaCommand(): Promise<Command> {
  const personaCommand = new Command('persona')
    .description('Manage AI personas');

  // Save a persona command
  personaCommand
    .command('save')
    .description('Save a new persona')
    .argument('<name>', 'Name for the persona')
    .argument('[systemPrompt]', 'System prompt for the persona')
    .option('-d, --description <description>', 'Description for the persona')
    .option('-s, --settings <settings>', 'Additional settings as JSON string')
    .action(async (name, systemPrompt, options) => {
      try {
        // If systemPrompt is not provided, try to read from stdin
        if (!systemPrompt) {
          const stdinBuffer: Buffer[] = [];
          process.stdin.on('data', (chunk) => stdinBuffer.push(Buffer.from(chunk)));
          process.stdin.on('end', async () => {
            const stdinContent = Buffer.concat(stdinBuffer).toString('utf8');
            await savePersona(name, stdinContent.trim(), options.description, options.settings);
          });
          process.stdin.resume();
        } else {
          await savePersona(name, systemPrompt, options.description, options.settings);
        }
      } catch (error) {
        console.error('Error saving persona:', error);
        process.exit(1);
      }
    });

  // List personas command
  personaCommand
    .command('list')
    .alias('ls')
    .description('List all saved personas')
    .action(async () => {
      try {
        const personas = await promptService.listPersonas();
        displayPersonas(personas);
      } catch (error) {
        console.error('Error listing personas:', error);
        process.exit(1);
      }
    });

  // Set (use) persona command
  personaCommand
    .command('set')
    .alias('use')
    .description('Set the current persona')
    .argument('<name>', 'Name of the persona to use')
    .action(async (name) => {
      try {
        const persona = await promptService.getPersona(name);
        if (!persona) {
          console.error(`Persona "${name}" not found`);
          process.exit(1);
        }

        // Set the system prompt in the environment or a config file
        // For now, we'll just set it in the environment variable
        process.env['GEMINI_SYSTEM_MD'] = createTempSystemPromptFile(persona.systemPrompt);
        console.log(`Persona "${name}" set as current. System prompt saved to: ${process.env['GEMINI_SYSTEM_MD']}`);
      } catch (error) {
        console.error('Error setting persona:', error);
        process.exit(1);
      }
    });

  // Edit persona command
  personaCommand
    .command('edit')
    .description('Edit a persona in nvim')
    .argument('<name>', 'Name of the persona to edit')
    .option('-e, --editor <editor>', 'Editor to use (default: nvim)', 'nvim')
    .action(async (name, options) => {
      try {
        const persona = await promptService.getPersona(name);
        if (!persona) {
          console.error(`Persona "${name}" not found`);
          process.exit(1);
        }

        // Create a temporary file with the persona's system prompt
        const tempDir = path.join(os.tmpdir(), 'qwen-personas');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `${persona.id}.md`);
        fs.writeFileSync(tempFilePath, persona.systemPrompt);

        // Launch the editor
        const editor = options.editor || 'nvim';
        const child = spawn(editor, [tempFilePath], { stdio: 'inherit' });

        child.on('close', async (code) => {
          if (code === 0) {
            // Read the modified content and update the persona
            const updatedSystemPrompt = fs.readFileSync(tempFilePath, 'utf-8');
            const updatedPersona = await promptService.updatePersona(persona.id, {
              systemPrompt: updatedSystemPrompt,
              updatedAt: new Date()
            });

            if (updatedPersona) {
              console.log(`Persona "${name}" updated successfully`);
            } else {
              console.error(`Error updating persona "${name}"`);
              process.exit(1);
            }
          } else {
            console.log('Editor closed without saving changes');
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
        });
      } catch (error) {
        console.error('Error editing persona:', error);
        process.exit(1);
      }
    });

  // Get persona command
  personaCommand
    .command('get')
    .description('Get a specific persona')
    .argument('<name>', 'Name of the persona to retrieve')
    .action(async (name) => {
      try {
        const persona = await promptService.getPersona(name);
        if (!persona) {
          console.error(`Persona "${name}" not found`);
          process.exit(1);
        }
        
        console.log(`Name: ${persona.name}`);
        console.log(`ID: ${persona.id}`);
        if (persona.description) {
          console.log(`Description: ${persona.description}`);
        }
        console.log(`System Prompt:\n${persona.systemPrompt}`);
        if (persona.settings) {
          console.log(`Settings: ${JSON.stringify(persona.settings, null, 2)}`);
        }
      } catch (error) {
        console.error('Error retrieving persona:', error);
        process.exit(1);
      }
    });

  // Delete persona command
  personaCommand
    .command('delete')
    .alias('rm')
    .description('Delete a persona')
    .argument('<name>', 'Name of the persona to delete')
    .action(async (name) => {
      try {
        const deleted = await promptService.deletePersona(name);
        if (deleted) {
          console.log(`Persona "${name}" deleted successfully`);
        } else {
          console.error(`Persona "${name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error deleting persona:', error);
        process.exit(1);
      }
    });

  return personaCommand;
}

async function savePersona(name: string, systemPrompt: string, description?: string, settingsStr?: string): Promise<void> {
  try {
    let settings: Record<string, any> | undefined;
    if (settingsStr) {
      try {
        settings = JSON.parse(settingsStr);
      } catch (e) {
        console.error('Invalid JSON for settings:', settingsStr);
        process.exit(1);
      }
    }
    
    await promptService.savePersona(name, systemPrompt, description, settings);
    console.log(`Persona "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving persona:', error);
    process.exit(1);
  }
}

function createTempSystemPromptFile(systemPrompt: string): string {
  const tempDir = path.join(os.tmpdir(), 'qwen-system-prompts');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  // Generate a unique filename based on timestamp
  const fileName = `system-prompt-${Date.now()}.md`;
  const filePath = path.join(tempDir, fileName);
  
  fs.writeFileSync(filePath, systemPrompt);
  return filePath;
}

function displayPersonas(personas: Persona[]): void {
  if (personas.length === 0) {
    console.log('No personas found');
    return;
  }

  console.log('Personas:');
  for (const persona of personas) {
    console.log(`\nName: ${persona.name}`);
    console.log(`ID: ${persona.id}`);
    if (persona.description) {
      console.log(`Description: ${persona.description}`);
    }
    console.log(`Created: ${persona.createdAt.toLocaleDateString()}`);
    console.log(`Updated: ${persona.updatedAt.toLocaleDateString()}`);
    console.log('---');
  }
}