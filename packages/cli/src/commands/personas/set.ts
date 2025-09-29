/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen persona set' subcommand
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Arguments, CommandModule } from 'yargs';
import { PromptService } from '@qwen-code/qwen-code-core';

interface PersonaSetOptions {
  _: (string | number)[];
  $0: string;
}

export const setCommand: CommandModule<{}, PersonaSetOptions> = {
  command: 'set <name>',
  aliases: ['use'],
  describe: 'Set the current persona',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the persona to use',
        type: 'string',
        demandOption: true
      }),
  handler: async (argv: Arguments<PersonaSetOptions>) => {
    const promptService = new PromptService();
    
    try {
      const name = argv['name'] as string;
      const persona = await promptService.getPersona(name);
      if (!persona) {
        console.error(`Persona "${name}" not found`);
        process.exit(1);
      }

      // Create a temporary file with the system prompt
      const tempDir = path.join(os.tmpdir(), 'qwen-system-prompts');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const fileName = `system-prompt-${Date.now()}-${name}.md`;
      const tempFilePath = path.join(tempDir, fileName);
      fs.writeFileSync(tempFilePath, persona.systemPrompt);
      
      // Set the system prompt in the environment
      process.env['GEMINI_SYSTEM_MD'] = tempFilePath;
      console.log(`Persona "${name}" set as current. System prompt saved to: ${tempFilePath}`);
      console.log('Note: This change will only affect new qwen sessions.');
    } catch (error) {
      console.error('Error setting persona:', error);
      process.exit(1);
    }
  }
};