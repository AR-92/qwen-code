/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona list' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { Persona } from '@qwen-code/qwen-code-core';

interface PersonaListOptions {
  _: (string | number)[];
  $0: string;
}

export const listCommand: CommandModule<{}, PersonaListOptions> = {
  command: 'list',
  aliases: ['ls'],
  describe: 'List all saved personas',
  builder: (yargs) => yargs,
  handler: async (argv: Arguments<PersonaListOptions>) => {
    const promptService = new PromptService();
    
    try {
      const personas = await promptService.listPersonas();
      displayPersonas(personas);
    } catch (error) {
      console.error('Error listing personas:', error);
      process.exit(1);
    }
  }
};

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