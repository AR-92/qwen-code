/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain edit' subcommand
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { spawn } from 'node:child_process';
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { TaskChain } from '@qwen-code/qwen-code-core';

interface ChainEditOptions {
  editor?: string;
  _: (string | number)[];
  $0: string;
}

export const editCommand: CommandModule<{}, ChainEditOptions> = {
  command: 'edit <name>',
  describe: 'Edit a task chain in nvim',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the task chain to edit',
        type: 'string',
        demandOption: true
      })
      .option('editor', {
        alias: 'e',
        type: 'string',
        describe: 'Editor to use (default: nvim)',
        default: 'nvim'
      }),
  handler: async (argv: Arguments<ChainEditOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
      const editor = argv.editor || 'nvim';
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
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    } catch (error) {
      console.error('Error editing task chain:', error);
      process.exit(1);
    }
  }
};