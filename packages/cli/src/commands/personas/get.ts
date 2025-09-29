/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona get' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PersonaGetOptions {
  _: (string | number)[];
  $0: string;
}

export const getCommand: CommandModule<{}, PersonaGetOptions> = {
  command: 'get <name>',
  describe: 'Get a specific persona',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the persona to retrieve',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<PersonaGetOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
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
  }
};