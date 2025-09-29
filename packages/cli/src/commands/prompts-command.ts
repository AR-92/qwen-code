/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'gemini prompt' command
import type { CommandModule, Argv } from 'yargs';

export const promptCommand: CommandModule = {
  command: 'prompt',
  describe: 'Manage prompt templates',
  builder: async (yargs: Argv) => {
    // Convert our Command instance to yargs-compatible format
    return yargs
      .command('save [name] [content]', 'Save a new prompt template', 
        (y: Argv) => y,
        async (argv: any) => {
          const mod = await import('./prompts.js');
          const cmd = await mod.createPromptCommand();
          await cmd.parseAsync(['save', ...argv._.slice(1)]);
        }
      )
      .command('list', 'List all saved prompt templates',
        (y: Argv) => y,
        async (argv: any) => {
          const mod = await import('./prompts.js');
          const cmd = await mod.createPromptCommand();
          await cmd.parseAsync(['list', ...argv._.slice(1)]);
        }
      )
      .command('edit <name>', 'Edit a prompt template in nvim',
        (y: Argv) => y,
        async (argv: any) => {
          const mod = await import('./prompts.js');
          const cmd = await mod.createPromptCommand();
          await cmd.parseAsync(['edit', ...argv._.slice(1)]);
        }
      )
      .command('get <name>', 'Get a specific prompt template',
        (y: Argv) => y,
        async (argv: any) => {
          const mod = await import('./prompts.js');
          const cmd = await mod.createPromptCommand();
          await cmd.parseAsync(['get', ...argv._.slice(1)]);
        }
      )
      .command('delete <name>', 'Delete a prompt template',
        (y: Argv) => y,
        async (argv: any) => {
          const mod = await import('./prompts.js');
          const cmd = await mod.createPromptCommand();
          await cmd.parseAsync(['delete', ...argv._.slice(1)]);
        }
      )
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false);
  },
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
    // thanks to demandCommand(1) in the builder.
  },
};