/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona edit' subcommand
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PersonaEditOptions {
  editor?: string;
  _: (string | number)[];
  $0: string;
}

export const editCommand: CommandModule<{}, PersonaEditOptions> = {
  command: 'edit <name>',
  describe: 'Edit a persona in nvim',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the persona to edit',
        type: 'string',
        demandOption: true
      })
      .option('editor', {
        alias: 'e',
        type: 'string',
        describe: 'Editor to use (default: nvim)',
        default: 'nvim'
      }),
  handler: async (argv: Arguments<PersonaEditOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
      const editor = argv.editor || 'nvim';
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
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    } catch (error) {
      console.error('Error editing persona:', error);
      process.exit(1);
    }
  }
};