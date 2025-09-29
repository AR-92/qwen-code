/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain delete' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface ChainDeleteOptions {
  _: (string | number)[];
  $0: string;
}

export const deleteCommand: CommandModule<{}, ChainDeleteOptions> = {
  command: 'delete <name>',
  aliases: ['rm'],
  describe: 'Delete a task chain',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the task chain to delete',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<ChainDeleteOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
  }
};