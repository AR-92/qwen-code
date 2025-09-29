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

export interface SlashCommandParams extends Record<string, unknown> {
  command: string;
  args?: string;
}

export class SlashCommandInvocation extends BaseToolInvocation<
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
      const command = this.params.command.toLowerCase();
      const args = this.params.args || '';
      
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
          return {
            llmContent: `Unknown slash command: /${command}. Available commands include: compress, clear, help, stats, quit, memory, chat, tools.`,
            returnDisplay: `Unknown slash command: /${command}. Available commands include: compress, clear, help, stats, quit, memory, chat, tools.`,
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

export class SlashCommandTool extends BaseDeclarativeTool<
  SlashCommandParams,
  ToolResult
> {
  static readonly NAME = 'slash_command';

  constructor(private readonly config: Config) {
    super(
      SlashCommandTool.NAME,
      'Execute slash commands',
      'Execute slash commands that are available in the Qwen Code interface. These commands provide various utilities like clearing the screen, managing settings, accessing help, etc.',
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
  ): SlashCommandInvocation {
    return new SlashCommandInvocation(this.config, params);
  }
}