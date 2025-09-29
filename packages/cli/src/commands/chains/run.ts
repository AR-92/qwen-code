/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// File for 'qwen chain run' subcommand
import type { Arguments, CommandModule } from 'yargs';
import { PromptService, TaskExecutionEngine } from '@qwen-code/qwen-code-core';


interface ChainRunOptions {
  context?: string;
  _: (string | number)[];
  $0: string;
}

export const runCommand: CommandModule<{}, ChainRunOptions> = {
  command: 'run <name>',
  describe: 'Execute a task chain',
  builder: (yargs) => 
    yargs
      .positional('name', {
        describe: 'Name of the task chain to execute',
        type: 'string',
        demandOption: true
      })
      .option('context', {
        alias: 'c',
        type: 'string',
        describe: 'Additional context for the chain as JSON string'
      }),
  handler: async (argv: Arguments<ChainRunOptions>) => {
    const promptService = new PromptService();
    const executionEngine = new TaskExecutionEngine();
    
    try {
      const name = argv['name'] as string;
      const chain = await promptService.getTaskChain(name);
      if (!chain) {
        console.error(`Task chain "${name}" not found`);
        process.exit(1);
      }
      
      // Parse additional context if provided
      let context: Record<string, any> = {};
      if (argv.context) {
        try {
          context = JSON.parse(argv.context);
        } catch (e) {
          console.error('Invalid JSON for context:', argv.context);
          process.exit(1);
        }
      }
      
      // Run the chain
      console.log(`Executing task chain: ${name}`);
      const result = await executionEngine.executeChain(chain, { ...chain.context, ...context });
      
      console.log(`\nExecution completed in ${result.executionTime}ms`);
      console.log(`Overall success: ${result.success}`);
      
      for (const taskResult of result.results) {
        console.log(`\nTask: ${taskResult.taskId}`);
        console.log(`  Success: ${taskResult.success}`);
        console.log(`  Execution time: ${taskResult.executionTime}ms`);
        if (taskResult.error) {
          console.log(`  Error: ${taskResult.error}`);
        }
        if (taskResult.exitCode !== undefined) {
          console.log(`  Exit code: ${taskResult.exitCode}`);
        }
        // Limit output length to prevent too much clutter
        const output = taskResult.output.substring(0, 500);
        if (output.length > 0) {
          console.log(`  Output: ${output}${taskResult.output.length > 500 ? '...' : ''}`);
        }
      }
    } catch (error) {
      console.error('Error running task chain:', error);
      process.exit(1);
    }
  }
};