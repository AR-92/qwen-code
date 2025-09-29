/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt delete' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PromptDeleteOptions {
  _: (string | number)[];
  $0: string;
}

export const deleteCommand: CommandModule<{}, PromptDeleteOptions> = {
  command: 'delete <name>',
  aliases: ['rm'],
  describe: 'Delete a prompt template',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the prompt template to delete',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<PromptDeleteOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
      const deleted = await promptService.deletePromptTemplate(name);
      if (deleted) {
        console.log(`Prompt template "${name}" deleted successfully`);
      } else {
        console.error(`Prompt template "${name}" not found`);
        process.exit(1);
      }
    } catch (error) {
      console.error('Error deleting prompt:', error);
      process.exit(1);
    }
  }
};