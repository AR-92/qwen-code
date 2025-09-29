/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain create' subcommand
import * as fs from 'node:fs';
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface ChainCreateOptions {
  description?: string;
  tags?: string;
  file?: string;
  _: (string | number)[];
  $0: string;
}

export const createCommand: CommandModule<{}, ChainCreateOptions> = {
  command: 'create <name>',
  describe: 'Create a new task chain',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name for the task chain',
        type: 'string',
        demandOption: true
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Description for the chain'
      })
      .option('tags', {
        alias: 't',
        type: 'string',
        describe: 'Comma-separated list of tags'
      })
      .option('file', {
        alias: 'f',
        type: 'string',
        describe: 'File containing the chain definition in JSON format'
      }),
  handler: async (argv: Arguments<ChainCreateOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
      let tags: string[] | undefined;
      
      if (argv.tags) {
        tags = argv.tags.split(',').map(tag => tag.trim());
      }
      
      if (argv.file) {
        // Create from file
        const fileContent = fs.readFileSync(argv.file, 'utf-8');
        const chainDefinition = JSON.parse(fileContent);
        await createChainFromFile(promptService, name, chainDefinition, argv.description, tags);
      } else {
        // Create interactively (placeholder for now)
        console.log(`Creating task chain "${name}" interactively is not yet implemented.`);
        console.log(`Please create a JSON file with your task chain definition and use the --file option.`);
        console.log('\nExample chain definition format:');
        console.log(JSON.stringify({
          tasks: [
            {
              id: "task1",
              name: "First Task",
              command: "echo",
              args: ["hello", "world"],
              onSuccess: "task2",
              onFailure: "task3"
            },
            {
              id: "task2",
              name: "Second Task",
              command: "ls",
              args: ["-la"]
            },
            {
              id: "task3",
              name: "Error Handler",
              command: "echo",
              args: ["Something went wrong"]
            }
          ],
          startTaskId: "task1"
        }, null, 2));
      }
    } catch (error) {
      console.error('Error creating task chain:', error);
      process.exit(1);
    }
  }
};

async function createChainFromFile(
  promptService: PromptService,
  name: string,
  chainDefinition: any,
  description?: string,
  tags?: string[]
): Promise<void> {
  try {
    // Validate the chain definition structure
    if (!chainDefinition.tasks || !Array.isArray(chainDefinition.tasks) || chainDefinition.tasks.length === 0) {
      throw new Error('Chain definition must include a non-empty tasks array');
    }
    
    if (!chainDefinition.startTaskId) {
      throw new Error('Chain definition must include a startTaskId');
    }
    
    await promptService.saveTaskChain(
      name, 
      chainDefinition.tasks, 
      chainDefinition.startTaskId, 
      description, 
      tags, 
      chainDefinition.context
    );
    
    console.log(`Task chain "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving task chain:', error);
    process.exit(1);
  }
}