/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen prompt list' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { PromptTemplate } from '@qwen-code/qwen-code-core';

interface PromptListOptions {
  tag?: string;
  _: (string | number)[];
  $0: string;
}

export const listCommand: CommandModule<{}, PromptListOptions> = {
  command: 'list',
  aliases: ['ls'],
  describe: 'List all saved prompt templates',
  builder: (yargs) => 
    yargs
      .option('tag', {
        alias: 't',
        type: 'string',
        describe: 'Filter by tag'
      }),
  handler: async (argv: Arguments<PromptListOptions>) => {
    const promptService = new PromptService();
    
    try {
      const templates = await promptService.listPromptTemplates();
      
      if (argv.tag) {
        const filtered = templates.filter(t => t.tags?.includes(argv.tag!));
        displayPromptTemplates(filtered);
      } else {
        displayPromptTemplates(templates);
      }
    } catch (error) {
      console.error('Error listing prompts:', error);
      process.exit(1);
    }
  }
};

function displayPromptTemplates(templates: PromptTemplate[]): void {
  if (templates.length === 0) {
    console.log('No prompt templates found');
    return;
  }

  console.log('Prompt Templates:');
  for (const template of templates) {
    console.log(`\nName: ${template.name}`);
    console.log(`ID: ${template.id}`);
    if (template.description) {
      console.log(`Description: ${template.description}`);
    }
    if (template.tags && template.tags.length > 0) {
      console.log(`Tags: ${template.tags.join(', ')}`);
    }
    console.log(`Created: ${template.createdAt.toLocaleDateString()}`);
    console.log(`Updated: ${template.updatedAt.toLocaleDateString()}`);
    console.log('---');
  }
}