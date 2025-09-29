/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt edit' subcommand
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PromptEditOptions {
  editor?: string;
  _: (string | number)[];
  $0: string;
}

export const editCommand: CommandModule<{}, PromptEditOptions> = {
  command: 'edit <name>',
  describe: 'Edit a prompt template in nvim',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the prompt template to edit',
        type: 'string',
        demandOption: true
      })
      .option('editor', {
        alias: 'e',
        type: 'string',
        describe: 'Editor to use (default: nvim)',
        default: 'nvim'
      }),
  handler: async (argv: Arguments<PromptEditOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
      const template = await promptService.getPromptTemplate(name);
      if (!template) {
        console.error(`Prompt template "${name}" not found`);
        process.exit(1);
      }

      // Create a temporary file with the prompt content
      const tempDir = path.join(os.tmpdir(), 'qwen-prompts');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const tempFilePath = path.join(tempDir, `${template.id}.md`);
      fs.writeFileSync(tempFilePath, template.content);

      // Launch the editor
      const editor = argv.editor || 'nvim';
      const child = spawn(editor, [tempFilePath], { stdio: 'inherit' });

      child.on('close', async (code) => {
        if (code === 0) {
          // Read the modified content and update the template
          const updatedContent = fs.readFileSync(tempFilePath, 'utf-8');
          const updatedTemplate = await promptService.updatePromptTemplate(template.id, {
            content: updatedContent,
            updatedAt: new Date()
          });

          if (updatedTemplate) {
            console.log(`Prompt template "${name}" updated successfully`);
          } else {
            console.error(`Error updating prompt template "${name}"`);
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
      console.error('Error editing prompt:', error);
      process.exit(1);
    }
  }
};