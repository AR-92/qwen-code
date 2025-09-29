/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Command } from 'commander';
import { PromptService } from '@qwen-code/qwen-code-core';
import type { PromptTemplate } from '@qwen-code/qwen-code-core';
import { spawn } from 'node:child_process';

const promptService = new PromptService();

export async function createPromptCommand(): Promise<Command> {
  const promptCommand = new Command('prompt')
    .description('Manage prompt templates');

  // Save a prompt command
  promptCommand
    .command('save')
    .description('Save a new prompt template')
    .argument('<name>', 'Name for the prompt template')
    .argument('[content]', 'Content of the prompt template')
    .option('-d, --description <description>', 'Description for the prompt')
    .option('-t, --tags <tags>', 'Comma-separated list of tags', (val) => val.split(','))
    .action(async (name, content, options) => {
      try {
        // If content is not provided, try to read from stdin
        if (!content) {
          const stdinBuffer: Buffer[] = [];
          process.stdin.on('data', (chunk) => stdinBuffer.push(Buffer.from(chunk)));
          process.stdin.on('end', async () => {
            const stdinContent = Buffer.concat(stdinBuffer).toString('utf8');
            await savePrompt(name, stdinContent.trim(), options.description, options.tags);
          });
          process.stdin.resume();
        } else {
          await savePrompt(name, content, options.description, options.tags);
        }
      } catch (error) {
        console.error('Error saving prompt:', error);
        process.exit(1);
      }
    });

  // List prompts command
  promptCommand
    .command('list')
    .alias('ls')
    .description('List all saved prompt templates')
    .option('-t, --tag <tag>', 'Filter by tag')
    .action(async (options) => {
      try {
        const templates = await promptService.listPromptTemplates();
        
        if (options.tag) {
          const filtered = templates.filter(t => t.tags?.includes(options.tag));
          displayPromptTemplates(filtered);
        } else {
          displayPromptTemplates(templates);
        }
      } catch (error) {
        console.error('Error listing prompts:', error);
        process.exit(1);
      }
    });

  // Edit prompt command
  promptCommand
    .command('edit')
    .description('Edit a prompt template in nvim')
    .argument('<name>', 'Name of the prompt template to edit')
    .option('-e, --editor <editor>', 'Editor to use (default: nvim)', 'nvim')
    .action(async (name, options) => {
      try {
        const template = await promptService.getPromptTemplate(name);
        if (!template) {
          console.error(`Prompt template "${name}" not found`);
          process.exit(1);
        }

        // Create a temporary file with the prompt content
        const tempDir = path.join(os.tmpdir(), 'qwen-prompts');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, `${template.id}.md`);
        fs.writeFileSync(tempFilePath, template.content);

        // Launch the editor
        const editor = options.editor || 'nvim';
        const child = spawn(editor, [tempFilePath], { stdio: 'inherit' });

        child.on('close', async (code) => {
          if (code === 0) {
            // Read the modified content and update the template
            const updatedContent = fs.readFileSync(tempFilePath, 'utf-8');
            const updatedTemplate = await promptService.updatePromptTemplate(template.id, {
              content: updatedContent,
              updatedAt: new Date()
            });

            if (updatedTemplate) {
              console.log(`Prompt template "${name}" updated successfully`);
            } else {
              console.error(`Error updating prompt template "${name}"`);
              process.exit(1);
            }
          } else {
            console.log('Editor closed without saving changes');
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFilePath);
        });
      } catch (error) {
        console.error('Error editing prompt:', error);
        process.exit(1);
      }
    });

  // Get prompt command
  promptCommand
    .command('get')
    .description('Get a specific prompt template')
    .argument('<name>', 'Name of the prompt template to retrieve')
    .action(async (name) => {
      try {
        const template = await promptService.getPromptTemplate(name);
        if (!template) {
          console.error(`Prompt template "${name}" not found`);
          process.exit(1);
        }
        
        console.log(template.content);
      } catch (error) {
        console.error('Error retrieving prompt:', error);
        process.exit(1);
      }
    });

  // Delete prompt command
  promptCommand
    .command('delete')
    .alias('rm')
    .description('Delete a prompt template')
    .argument('<name>', 'Name of the prompt template to delete')
    .action(async (name) => {
      try {
        const deleted = await promptService.deletePromptTemplate(name);
        if (deleted) {
          console.log(`Prompt template "${name}" deleted successfully`);
        } else {
          console.error(`Prompt template "${name}" not found`);
          process.exit(1);
        }
      } catch (error) {
        console.error('Error deleting prompt:', error);
        process.exit(1);
      }
    });

  return promptCommand;
}

async function savePrompt(name: string, content: string, description?: string, tags?: string[]): Promise<void> {
  try {
    await promptService.savePromptTemplate(name, content, description, tags);
    console.log(`Prompt template "${name}" saved successfully`);
  } catch (error) {
    console.error('Error saving prompt:', error);
    process.exit(1);
  }
}

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