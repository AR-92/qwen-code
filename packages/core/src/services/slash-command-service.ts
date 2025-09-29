/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';

// Define minimal interfaces needed for core-level command execution
// We avoid importing from CLI package to prevent circular dependencies
export interface CommandContext {
  services: {
    config: Config;
    [key: string]: any; // Additional services as needed
  };
  invocation?: {
    raw: string;
    name: string;
    args: string;
  };
  session?: {
    [key: string]: any; // Session-specific data
  };
}

export interface SlashCommandActionReturn {
  type?: string;
  [key: string]: any; // Flexible return type
}

export interface SlashCommand {
  name: string;
  altNames?: string[];
  description: string;
  action?: (
    context: CommandContext,
    args: string,
  ) => void | SlashCommandActionReturn | Promise<void | SlashCommandActionReturn>;
  subCommands?: SlashCommand[];
}

/**
 * Service to handle slash command execution in the core layer (not UI).
 * This allows tools to execute slash commands programmatically.
 */
export class SlashCommandService {
  private commands: readonly SlashCommand[] = [];

  constructor(private readonly config: Config) {}

  /**
   * Initializes the slash command service by loading all available commands.
   */
  async initialize(): Promise<void> {
    // For now, we'll initialize with an empty command list
    // In a real implementation, core-level commands would be registered here
    this.commands = [];
  }

  /**
   * Executes a slash command by name with given arguments.
   * @param commandName The name (or alias) of the command to execute
   * @param args Arguments to pass to the command
   * @returns The result of the command execution
   */
  async executeCommand(
    commandName: string, 
    args: string = ''
  ): Promise<SlashCommandActionReturn | undefined> {
    if (!commandName) {
      throw new Error('Command name is required');
    }

    // Look for the command in the loaded commands
    const commandToExecute = this.findCommand(commandName);
    
    if (!commandToExecute) {
      throw new Error(`Unknown command: ${commandName}`);
    }

    if (!commandToExecute.action) {
      throw new Error(`Command '${commandToExecute.name}' has no executable action`);
    }

    // Create a minimal command context for the core execution
    const commandContext: CommandContext = {
      services: {
        config: this.config,
      },
      session: {
        // Session-specific data as needed
      },
      invocation: {
        raw: `/${commandName}${args ? ' ' + args : ''}`,
        name: commandToExecute.name,
        args
      }
    };

    // Execute the command action
    try {
      const result = await commandToExecute.action(commandContext, args);
      // If the command action returns void, return undefined
      return result === undefined ? undefined : result;
    } catch (error) {
      throw error instanceof Error 
        ? error 
        : new Error(`Command execution failed: ${String(error)}`);
    }
  }

  /**
   * Finds a command by name or alias among all loaded commands.
   */
  private findCommand(commandName: string): SlashCommand | undefined {
    // First try to find by primary name
    let command = this.commands.find(cmd => cmd.name.toLowerCase() === commandName.toLowerCase());
    
    if (!command) {
      // Then try to find by alias
      command = this.commands.find(cmd => 
        cmd.altNames?.some(alias => alias.toLowerCase() === commandName.toLowerCase())
      );
    }

    if (!command) {
      // Handle nested commands like "memory add", "chat save", etc.
      const parts = commandName.split(' ');
      if (parts.length > 1) {
        const parentCommand = this.commands.find(cmd => 
          cmd.name.toLowerCase() === parts[0].toLowerCase() || 
          cmd.altNames?.some(alias => alias.toLowerCase() === parts[0].toLowerCase())
        );
        
        if (parentCommand?.subCommands) {
          const subCommandName = parts[1];
          const subCommand = parentCommand.subCommands.find(subCmd => 
            subCmd.name.toLowerCase() === subCommandName.toLowerCase() || 
            subCmd.altNames?.some(alias => alias.toLowerCase() === subCommandName.toLowerCase())
          );
          
          if (subCommand) {
            command = subCommand;
          }
        }
      }
    }

    return command;
  }

  /**
   * Lists all available commands.
   */
  getCommands(): readonly SlashCommand[] {
    return this.commands;
  }
}