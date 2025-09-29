/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona' command
import type { CommandModule } from 'yargs';
import { saveCommand } from './personas/save.js';
import { listCommand } from './personas/list.js';
import { setCommand } from './personas/set.js';
import { editCommand } from './personas/edit.js';
import { getCommand } from './personas/get.js';
import { deleteCommand } from './personas/delete.js';

export const personaCommand: CommandModule = {
  command: 'persona',
  describe: 'Manage AI personas',
  builder: (yargs) =>
    yargs
      .command(saveCommand)
      .command(listCommand)
      .command(setCommand)
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