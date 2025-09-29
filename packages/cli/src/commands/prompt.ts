/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt' command
import type { CommandModule } from 'yargs';
import { saveCommand } from './prompts/save.js';
import { listCommand } from './prompts/list.js';
import { editCommand } from './prompts/edit.js';
import { getCommand } from './prompts/get.js';
import { deleteCommand } from './prompts/delete.js';

export const promptCommand: CommandModule = {
  command: 'prompt',
  describe: 'Manage prompt templates',
  builder: (yargs) =>
    yargs
      .command(saveCommand)
      .command(listCommand)
      .command(editCommand)
      .command(getCommand)
      .command(deleteCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
    // thanks to demandCommand(1) in the builder.
  },
};