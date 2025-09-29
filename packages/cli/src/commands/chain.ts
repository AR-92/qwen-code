/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain' command
import type { CommandModule } from 'yargs';
import { createCommand } from './chains/create.js';
import { listCommand } from './chains/list.js';
import { editCommand } from './chains/edit.js';
import { getCommand } from './chains/get.js';
import { deleteCommand } from './chains/delete.js';
import { runCommand } from './chains/run.js';

export const chainCommand: CommandModule = {
  command: 'chain',
  describe: 'Manage task chains',
  builder: (yargs) =>
    yargs
      .command(createCommand)
      .command(listCommand)
      .command(editCommand)
      .command(getCommand)
      .command(deleteCommand)
      .command(runCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // yargs will automatically show help if no subcommand is provided
    // thanks to demandCommand(1) in the builder.
  },
};