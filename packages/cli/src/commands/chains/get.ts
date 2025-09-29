/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain get' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface ChainGetOptions {
  _: (string | number)[];
  $0: string;
}

export const getCommand: CommandModule<{}, ChainGetOptions> = {
  command: 'get <name>',
  describe: 'Get a specific task chain',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the task chain to retrieve',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<ChainGetOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
  }
};