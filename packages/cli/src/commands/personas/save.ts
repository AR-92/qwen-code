/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona save' subcommand

import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PersonaSaveOptions {
  description?: string;
  settings?: string;
  _: (string | number)[];
  $0: string;
}

export const saveCommand: CommandModule<{}, PersonaSaveOptions> = {
  command: 'save <name> [systemPrompt]',
  describe: 'Save a new persona',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name for the persona',
        type: 'string',
        demandOption: true
      })
      .positional('systemPrompt', {
        describe: 'System prompt for the persona',
        type: 'string'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Description for the persona'
      })
      .option('settings', {
        alias: 's',
        type: 'string',
        describe: 'Additional settings as JSON string'
      }),
  handler: async (argv: Arguments<PersonaSaveOptions>) => {
    const promptService = new PromptService();
    
    try {
      let { description } = argv;
      let systemPrompt: string | undefined = argv['systemPrompt'] as string | undefined;
      const name = argv['name'] as string;
      let settings: Record<string, any> | undefined;
      
      if (argv.settings) {
        try {
          settings = JSON.parse(argv.settings);
        } catch (e) {
          console.error('Invalid JSON for settings:', argv.settings);
          process.exit(1);
        }
      }
      
      // If systemPrompt is not provided as argument, try to read from stdin
      if (!systemPrompt) {
        const stdinBuffer: Buffer[] = [];
        process.stdin.on('data', (chunk) => stdinBuffer.push(Buffer.from(chunk)));
        process.stdin.on('end', async () => {
          const stdinContent = Buffer.concat(stdinBuffer).toString('utf8');
          await savePersona(promptService, name, stdinContent.trim(), description, settings);
        });
        process.stdin.resume();
      } else {
        await savePersona(promptService, name, systemPrompt || '', description, settings);
      }
    } catch (error) {
      console.error('Error saving persona:', error);
      process.exit(1);
    }
  }
};

async function savePersona(
  promptService: PromptService,
  name: string,
  systemPrompt: string,
  description?: string,
  settings?: Record<string, any>
): Promise<void> {
  try {
    await promptService.savePersona(name, systemPrompt, description, settings);
    console.log(`Persona "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving persona:', error);
    process.exit(1);
  }
}