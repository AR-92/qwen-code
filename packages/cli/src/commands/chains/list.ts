/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain list' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { TaskChain } from '@qwen-code/qwen-code-core';

interface ChainListOptions {
  tag?: string;
  _: (string | number)[];
  $0: string;
}

export const listCommand: CommandModule<{}, ChainListOptions> = {
  command: 'list',
  aliases: ['ls'],
  describe: 'List all saved task chains',
  builder: (yargs) => 
    yargs
      .option('tag', {
        alias: 't',
        type: 'string',
        describe: 'Filter by tag'
      }),
  handler: async (argv: Arguments<ChainListOptions>) => {
    const promptService = new PromptService();
    
    try {
      const chains = await promptService.listTaskChains();
      
      if (argv.tag) {
        const filtered = chains.filter(c => c.tags?.includes(argv.tag!));
        displayTaskChains(filtered);
      } else {
        displayTaskChains(chains);
      }
    } catch (error) {
      console.error('Error listing task chains:', error);
      process.exit(1);
    }
  }
};

function displayTaskChains(chains: TaskChain[]): void {
  if (chains.length === 0) {
    console.log('No task chains found');
    return;
  }

  console.log('Task Chains:');
  for (const chain of chains) {
    console.log(`\nName: ${chain.name}`);
    console.log(`ID: ${chain.id}`);
    if (chain.description) {
      console.log(`Description: ${chain.description}`);
    }
    if (chain.tags && chain.tags.length > 0) {
      console.log(`Tags: ${chain.tags.join(', ')}`);
    }
    console.log(`Tasks: ${chain.tasks.length} tasks`);
    console.log(`Start Task: ${chain.startTaskId}`);
    console.log(`Created: ${chain.createdAt.toLocaleDateString()}`);
    console.log(`Updated: ${chain.updatedAt.toLocaleDateString()}`);
    console.log('---');
  }
}