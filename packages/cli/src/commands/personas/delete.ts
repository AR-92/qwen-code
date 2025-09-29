/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona delete' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PersonaDeleteOptions {
  _: (string | number)[];
  $0: string;
}

export const deleteCommand: CommandModule<{}, PersonaDeleteOptions> = {
  command: 'delete <name>',
  aliases: ['rm'],
  describe: 'Delete a persona',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the persona to delete',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<PersonaDeleteOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
  }
};