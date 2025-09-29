/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FunctionDeclaration } from '@google/genai';
import {
  BaseDeclarativeTool,
  BaseToolInvocation,
  type ToolResult,
  type ToolResultDisplay,
  Kind,
} from './tools.js';
import { ToolErrorType } from './tool-error.js';
import type { Config } from '../config/config.js';
import { CompressionStatus } from '../core/turn.js';
import { CommandService } from '../../cli/src/services/CommandService.js';
import { BuiltinCommandLoader } from '../../cli/src/services/BuiltinCommandLoader.js';
import { FileCommandLoader } from '../../cli/src/services/FileCommandLoader.js';
import { McpPromptLoader } from '../../cli/src/services/McpPromptLoader.js';
import type { SlashCommand, CommandContext } from '../../cli/src/ui/commands/types.js';
import { MessageType } from '../../cli/src/ui/types.js';

// Simple in-memory storage for command execution results
class SimpleStorage {
  private data: Map<string, any> = new Map();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// Simple logger implementation for command context
class SimpleLogger {
  async initialize(): Promise<void> {
    // No-op for simple implementation
  }

  async saveCheckpoint(_history: any[], _tag: string): Promise<void> {
    // No-op for simple implementation
  }

  async loadCheckpoint(_tag: string): Promise<any[]> {
    return [];
  }

  async deleteCheckpoint(_tag: string): Promise<boolean> {
    return false;
  }

  async checkpointExists(_tag: string): Promise<boolean> {
    return false;
  }
}

export interface SlashCommandParams extends Record<string, unknown> {
  command: string;
  args?: string;
}

export class EnhancedSlashCommandInvocation extends BaseToolInvocation<
  SlashCommandParams,
  ToolResult
> {
  constructor(
    private readonly config: Config,
    params: SlashCommandParams,
  ) {
    super(params);
  }

  getDescription(): string {
    return `Executing slash command: /${this.params.command} ${this.params.args || ''}`;
  }

  async execute(
    signal: AbortSignal,
    _updateOutput?: (output: ToolResultDisplay) => void,
  ): Promise<ToolResult> {
    try {
      const commandName = this.params.command.toLowerCase();
      const args = this.params.args || '';
      
      // Load all available commands
      const loaders = [
        new McpPromptLoader(this.config),
        new BuiltinCommandLoader(this.config),
        new FileCommandLoader(this.config),
      ];
      const commandService = await CommandService.create(loaders, signal);
      const allCommands = commandService.getCommands();
      
      // Find the command to execute
      const commandToExecute = allCommands.find(
        cmd => cmd.name === commandName || (cmd.altNames && cmd.altNames.includes(commandName))
      );
      
      if (!commandToExecute) {
        // Fallback to the original implementation for unsupported commands
        return this.executeOriginalCommand(commandName, args);
      }
      
      // Create a minimal command context for execution
      const storage = new SimpleStorage();
      const logger = new SimpleLogger();
      
      const commandContext: CommandContext = {
        invocation: {
          raw: `/${commandName} ${args}`,
          name: commandName,
          args: args,
        },
        services: {
          config: this.config,
          settings: {
            approvalMode: 'default',
            autoCompressThreshold: 10000,
            disableAutoCompression: false,
            enableCorgiMode: false,
            enableFileSystemAccess: false,
            enableTerminalCommands: false,
            enableVimMode: false,
            fileWatcherEnabled: true,
            maxRetries: 3,
            model: 'gemini-1.5-pro',
            outputFormat: 'markdown',
            privacyLevel: 'standard',
            shellTimeoutMs: 30000,
            streaming: true,
            theme: 'default',
            toolTimeoutMs: 30000,
            verboseLogging: false,
          },
          git: undefined, // Simplified for this implementation
          logger: logger,
        },
        ui: {
          addItem: () => {}, // No-op for tool execution
          clear: () => {}, // No-op for tool execution
          loadHistory: () => {}, // No-op for tool execution
          setDebugMessage: () => {}, // No-op for tool execution
          pendingItem: null,
          setPendingItem: () => {}, // No-op for tool execution
          toggleCorgiMode: () => {}, // No-op for tool execution
          toggleVimEnabled: async () => false, // Simplified for this implementation
          setGeminiMdFileCount: () => {}, // No-op for tool execution
          reloadCommands: () => {}, // No-op for tool execution
        },
        session: {
          stats: {
            sessionStartTime: new Date(),
            totalTokensUsed: 0,
            totalTurns: 0,
            totalToolCalls: 0,
            totalUserMessages: 0,
          },
          sessionShellAllowlist: new Set<string>(),
        },
      };
      
      // Execute the command
      if (commandToExecute.action) {
        const result = await commandToExecute.action(commandContext, args);
        
        if (result) {
          switch (result.type) {
            case 'message':
              return {
                llmContent: result.content,
                returnDisplay: result.content,
              };
            case 'tool':
              return {
                llmContent: `Scheduled tool call: ${result.toolName}`,
                returnDisplay: `Scheduled tool call: ${result.toolName}`,
              };
            case 'quit':
            case 'quit_confirmation':
              return {
                llmContent: 'Quit command received. This would exit the application in interactive mode.',
                returnDisplay: 'Quit command received. This would exit the application in interactive mode.',
              };
            case 'dialog':
              return {
                llmContent: `Opening dialog: ${result.dialog}`,
                returnDisplay: `Opening dialog: ${result.dialog}`,
              };
            case 'load_history':
              return {
                llmContent: 'Loading conversation history',
                returnDisplay: 'Loading conversation history',
              };
            case 'submit_prompt':
              return {
                llmContent: 'Submitting prompt to model',
                returnDisplay: 'Submitting prompt to model',
              };
            case 'confirm_shell_commands':
              return {
                llmContent: `Command requires shell confirmation for: ${result.commandsToConfirm.join(', ')}`,
                returnDisplay: `Command requires shell confirmation for: ${result.commandsToConfirm.join(', ')}`,
              };
            case 'confirm_action':
              return {
                llmContent: 'Command requires user confirmation',
                returnDisplay: 'Command requires user confirmation',
              };
            default:
              return {
                llmContent: 'Command executed successfully',
                returnDisplay: 'Command executed successfully',
              };
          }
        } else {
          return {
            llmContent: 'Command executed successfully',
            returnDisplay: 'Command executed successfully',
          };
        }
      } else {
        return {
          llmContent: `Command '${commandName}' is available but has no action.`,
          returnDisplay: `Command '${commandName}' is available but has no action.`,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error executing slash command: ${errorMessage}`,
        returnDisplay: `Error executing slash command: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
  
  private async executeOriginalCommand(command: string, args: string): Promise<ToolResult> {
    // Execute specific commands based on their functionality
    switch (command) {
      case 'compress':
      case 'summarize':
        return this.executeCompressCommand();
      case 'clear':
        return this.executeClearCommand();
      case 'help':
        return this.executeHelpCommand();
      case 'stats':
        return this.executeStatsCommand();
      case 'quit':
        return this.executeQuitCommand();
      case 'memory':
        return this.executeMemoryCommand(args);
      case 'chat':
        return this.executeChatCommand(args);
      case 'tools':
        return this.executeToolsCommand(args);
      // Add more commands as needed
      default:
        // Get list of all available commands
        const loaders = [
          new McpPromptLoader(this.config),
          new BuiltinCommandLoader(this.config),
          new FileCommandLoader(this.config),
        ];
        const controller = new AbortController();
        const commandService = await CommandService.create(loaders, controller.signal);
        const allCommands = commandService.getCommands();
        const commandNames = allCommands.map(cmd => cmd.name).join(', ');
        
        return {
          llmContent: `Unknown slash command: /${command}. Available commands include: ${commandNames}`,
          returnDisplay: `Unknown slash command: /${command}. Available commands include: ${commandNames}`,
        };
    }
  }
  
  private async executeCompressCommand(): Promise<ToolResult> {
    try {
      const client = this.config.getGeminiClient();
      const compressed = await client.tryCompressChat(`compress-${Date.now()}`, true);
      
      const message = compressed.compressionStatus === CompressionStatus.COMPRESSED 
        ? `Chat history compressed from ${compressed.originalTokenCount} to ${compressed.newTokenCount} tokens.`
        : `Compression attempted but no significant reduction achieved. Status: ${compressed.compressionStatus}`;
        
      return {
        llmContent: message,
        returnDisplay: message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Failed to compress chat history: ${errorMessage}`,
        returnDisplay: `Failed to compress chat history: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
  
  private executeClearCommand(): Promise<ToolResult> {
    // Note: The actual clearing happens in the UI layer, not in the core
    // For the tool, we just return a message that the action is recognized
    return Promise.resolve({
      llmContent: 'Clear command recognized. The session state would be cleared in the interactive UI.',
      returnDisplay: 'Clear command recognized. The session state would be cleared in the interactive UI.',
    });
  }
  
  private executeHelpCommand(): Promise<ToolResult> {
    const helpText = `
Available slash commands:
/ compress - Compress conversation history to save tokens
/ clear - Clear conversation history
/ help - Show this help message
/ stats - Show current session information
/ quit - Exit Qwen Code
/ memory - Manage memory files
/ chat - Manage chat sessions
/ tools - List available Qwen Code tools
/ tools desc - List tools with descriptions

These commands can be used to manage your session and workflow.
    `.trim();
    
    return Promise.resolve({
      llmContent: helpText,
      returnDisplay: helpText,
    });
  }
  
  private executeStatsCommand(): Promise<ToolResult> {
    const stats = this.config.getSessionTokenLimit();
    const statsText = `Session stats:\n- Session Token Limit: ${stats}\n- Current Session ID: ${this.config.getSessionId()}\n- Model: ${this.config.getModel()}`;
    
    return Promise.resolve({
      llmContent: statsText,
      returnDisplay: statsText,
    });
  }
  
  private executeQuitCommand(): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: 'Quit command received. The application would exit in the interactive UI.',
      returnDisplay: 'Quit command received. The application would exit in the interactive UI.',
    });
  }
  
  private executeMemoryCommand(args: string): Promise<ToolResult> {
    // Memory command is complex with subcommands, return a message for now
    return Promise.resolve({
      llmContent: `Memory command with args: "${args}". The memory system is managed through the memory tool.`,
      returnDisplay: `Memory command with args: "${args}". The memory system is managed through the memory tool.`,
    });
  }
  
  private executeChatCommand(args: string): Promise<ToolResult> {
    // Chat command is complex with subcommands, return a message for now
    return Promise.resolve({
      llmContent: `Chat command with args: "${args}". Chat management features are available in interactive mode.`,
      returnDisplay: `Chat command with args: "${args}". Chat management features are available in interactive mode.`,
    });
  }
  
  private executeToolsCommand(args: string): Promise<ToolResult> {
    const toolRegistry = this.config.getToolRegistry();
    const allTools = toolRegistry.getAllTools();
    
    if (args === 'desc' || args === 'description' || args === 'descriptions') {
      // Show tools with descriptions
      const toolsWithDescriptions = allTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n');
      const toolsText = `Available tools with descriptions:\n${toolsWithDescriptions || 'No tools available'}`;
      return Promise.resolve({
        llmContent: toolsText,
        returnDisplay: toolsText,
      });
    } else {
      // Show just the tool names
      const toolNames = allTools.map(tool => `- ${tool.name}`).join('\n');
      const toolsText = `Available tools:\n${toolNames || 'No tools available'}`;
      return Promise.resolve({
        llmContent: toolsText,
        returnDisplay: toolsText,
      });
    }
  }
}

export class EnhancedSlashCommandTool extends BaseDeclarativeTool<
  SlashCommandParams,
  ToolResult
> {
  static readonly NAME = 'slash_command';

  constructor(private readonly config: Config) {
    super(
      EnhancedSlashCommandTool.NAME,
      'Execute slash commands',
      'Execute slash commands that are available in the Qwen Code interface. These commands provide various utilities like clearing the screen, managing settings, accessing help, etc. All available slash commands can be executed through this tool.',
      Kind.Other,
      {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The slash command to execute (without the leading slash)',
          },
          args: {
            type: 'string',
            description: 'Optional arguments for the slash command',
          },
        },
        required: ['command'],
      } as FunctionDeclaration['parametersJsonSchema'],
      false, // isOutputMarkdown
      false, // canUpdateOutput
    );
  }

  protected createInvocation(
    params: SlashCommandParams,
  ): EnhancedSlashCommandInvocation {
    return new EnhancedSlashCommandInvocation(this.config, params);
  }
}