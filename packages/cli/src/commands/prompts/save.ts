/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt save' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PromptSaveOptions {
  description?: string;
  tags?: string;
  _: (string | number)[];
  $0: string;
}

export const saveCommand: CommandModule<{}, PromptSaveOptions> = {
  command: 'save <name> [content]',
  describe: 'Save a new prompt template',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name for the prompt template',
        type: 'string',
        demandOption: true
      })
      .positional('content', {
        describe: 'Content of the prompt template',
        type: 'string'
      })
      .option('description', {
        alias: 'd',
        type: 'string',
        describe: 'Description for the prompt'
      })
      .option('tags', {
        alias: 't',
        type: 'string',
        describe: 'Comma-separated list of tags'
      }),
  handler: async (argv: Arguments<PromptSaveOptions>) => {
    const promptService = new PromptService();
    
    try {
      let { description } = argv;
      let content: string | undefined = argv['content'] as string | undefined;
      const name = argv['name'] as string;
      let tags: string[] | undefined;
      
      if (argv.tags) {
        tags = argv.tags.split(',').map(tag => tag.trim());
      }
      
      // If content is not provided as argument, try to read from stdin
      if (!content) {
        const stdinBuffer: Buffer[] = [];
        process.stdin.on('data', (chunk) => stdinBuffer.push(Buffer.from(chunk)));
        process.stdin.on('end', async () => {
          const stdinContent = Buffer.concat(stdinBuffer).toString('utf8');
          await savePrompt(promptService, name, stdinContent.trim(), description, tags);
        });
        process.stdin.resume();
      } else {
        await savePrompt(promptService, name, content || '', description, tags);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      process.exit(1);
    }
  }
};

async function savePrompt(
  promptService: PromptService, 
  name: string, 
  content: string, 
  description?: string, 
  tags?: string[]
): Promise<void> {
  try {
    await promptService.savePromptTemplate(name, content, description, tags);
    console.log(`Prompt template "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving prompt:', error);
    process.exit(1);
  }
}