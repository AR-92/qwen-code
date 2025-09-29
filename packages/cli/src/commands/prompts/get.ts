/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt get' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PromptGetOptions {
  _: (string | number)[];
  $0: string;
}

export const getCommand: CommandModule<{}, PromptGetOptions> = {
  command: 'get <name>',
  describe: 'Get a specific prompt template',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the prompt template to retrieve',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<PromptGetOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
      const template = await promptService.getPromptTemplate(name);
      if (!template) {
        console.error(`Prompt template "${name}" not found`);
        process.exit(1);
      }
      
      console.log(template.content);
    } catch (error) {
      console.error('Error retrieving prompt:', error);
      process.exit(1);
    }
  }
};