/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CompressionStatus } from '../core/turn.js';
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
import * as path from 'node:path';

export interface SlashCommandParams extends Record<string, unknown> {
  command: string;
  args?: string;
}

/**
 * Enhanced slash command tool that provides access to a broader range of Qwen Code slash commands.
 * This tool allows the AI agent to execute many of the same commands that are available in the CLI.
 */
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
        case 'model':
          return this.executeModelCommand(args);
        case 'theme':
          return this.executeThemeCommand(args);
        case 'settings':
          return this.executeSettingsCommand(args);
        case 'auth':
          return this.executeAuthCommand(args);
        case 'extensions':
          return this.executeExtensionsCommand(args);
        case 'mcp':
          return this.executeMcpCommand(args);
        case 'privacy':
          return this.executePrivacyCommand(args);
        case 'docs':
          return this.executeDocsCommand(args);
        case 'bug':
          return this.executeBugCommand(args);
        case 'setup-github':
        case 'setupGithub':
          return this.executeSetupGithubCommand(args);
        case 'terminal-setup':
        case 'terminal':
          return this.executeTerminalSetupCommand(args);
        case 'vim':
          return this.executeVimCommand(args);
        case 'approval-mode':
        case 'approval':
          return this.executeApprovalModeCommand(args);
        case 'persona':
          return this.executePersonaCommand(args);
        case 'chain':
          return this.executeChainCommand(args);
        case 'prompt':
          return this.executePromptCommand(args);
        case 'agents':
          return this.executeAgentsCommand(args);
        case 'copy':
          return this.executeCopyCommand(args);
        case 'restore':
          return this.executeRestoreCommand(args);
        case 'editor':
          return this.executeEditorCommand(args);
        case 'about':
          return this.executeAboutCommand(args);
        case 'corgi':
          return this.executeCorgiCommand(args);
        case 'ide':
          return this.executeIdeCommand(args);
        case 'init':
          return this.executeInitCommand(args);
        case 'summary':
          return this.executeSummaryCommand(args);
        case 'ls':
          return this.executeLsCommand(args);
        case 'cat':
          return this.executeCatCommand(args);
        case 'grep':
          return this.executeGrepCommand(args);
        default:
          return {
            llmContent: `Unknown slash command: /${command}. Available commands include: compress, clear, help, stats, quit, memory, chat, tools, model, theme, settings, auth, extensions, mcp, privacy, docs, bug, setup-github, terminal-setup, vim, approval-mode, persona, chain, prompt, agents, copy, restore, editor, about, corgi, ide, init, summary, ls, cat, grep.`,
            returnDisplay: `Unknown slash command: /${command}. Available commands include: compress, clear, help, stats, quit, memory, chat, tools, model, theme, settings, auth, extensions, mcp, privacy, docs, bug, setup-github, terminal-setup, vim, approval-mode, persona, chain, prompt, agents, copy, restore, editor, about, corgi, ide, init, summary, ls, cat, grep.`,
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
/ model - Manage language model settings
/ theme - Manage UI theme
/ settings - Manage application settings
/ auth - Configure authentication
/ extensions - Manage extensions
/ mcp - Manage MCP servers
/ privacy - View privacy notice
/ docs - Access documentation
/ bug - Report bugs
/ setup-github - Configure GitHub integration
/ terminal-setup - Configure terminal integration
/ vim - Toggle Vim mode
/ approval-mode - Change approval mode
/ persona - Manage personas
/ chain - Manage command chains
/ prompt - Manage prompts
/ agents - Manage agents
/ copy - Copy content to clipboard
/ restore - Restore previous sessions
/ editor - Configure editor settings
/ about - Show version information
/ corgi - Toggle corgi mode
/ ide - Configure IDE integration
/ init - Initialize new projects
/ summary - Generate session summary
/ ls - List directory contents (e.g., /ls path/to/directory)
/ cat - Read a file (e.g., /cat path/to/file.txt)
/ grep - Search for patterns in files (e.g., /grep pattern [path])

These commands can be used to manage your session and workflow.
    `.trim();
    
    return Promise.resolve({
      llmContent: helpText,
      returnDisplay: helpText,
    });
  }
  
  private executeStatsCommand(): Promise<ToolResult> {
    const stats = this.config.getSessionTokenLimit();
    const statsText = `Session stats:
- Session Token Limit: ${stats}
- Current Session ID: ${this.config.getSessionId()}
- Model: ${this.config.getModel()}`;
    
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
      const toolsText = `Available tools with descriptions:
${toolsWithDescriptions || 'No tools available'}`;
      return Promise.resolve({
        llmContent: toolsText,
        returnDisplay: toolsText,
      });
    } else {
      // Show just the tool names
      const toolNames = allTools.map(tool => `- ${tool.name}`).join('\n');
      const toolsText = `Available tools:
${toolNames || 'No tools available'}`;
      return Promise.resolve({
        llmContent: toolsText,
        returnDisplay: toolsText,
      });
    }
  }
  
  private executeModelCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Model command with args: "${args}". Model management features are available in interactive mode.`,
      returnDisplay: `Model command with args: "${args}". Model management features are available in interactive mode.`,
    });
  }
  
  private executeThemeCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Theme command with args: "${args}". Theme management features are available in interactive mode.`,
      returnDisplay: `Theme command with args: "${args}". Theme management features are available in interactive mode.`,
    });
  }
  
  private executeSettingsCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Settings command with args: "${args}". Settings management features are available in interactive mode.`,
      returnDisplay: `Settings command with args: "${args}". Settings management features are available in interactive mode.`,
    });
  }
  
  private executeAuthCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Auth command with args: "${args}". Authentication features are available in interactive mode.`,
      returnDisplay: `Auth command with args: "${args}". Authentication features are available in interactive mode.`,
    });
  }
  
  private executeExtensionsCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Extensions command with args: "${args}". Extensions management features are available in interactive mode.`,
      returnDisplay: `Extensions command with args: "${args}". Extensions management features are available in interactive mode.`,
    });
  }
  
  private executeMcpCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `MCP command with args: "${args}". MCP server management features are available in interactive mode.`,
      returnDisplay: `MCP command with args: "${args}". MCP server management features are available in interactive mode.`,
    });
  }
  
  private executePrivacyCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Privacy command with args: "${args}". Privacy notice features are available in interactive mode.`,
      returnDisplay: `Privacy command with args: "${args}". Privacy notice features are available in interactive mode.`,
    });
  }
  
  private executeDocsCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Docs command with args: "${args}". Documentation features are available in interactive mode.`,
      returnDisplay: `Docs command with args: "${args}". Documentation features are available in interactive mode.`,
    });
  }
  
  private executeBugCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Bug command with args: "${args}". Bug reporting features are available in interactive mode.`,
      returnDisplay: `Bug command with args: "${args}". Bug reporting features are available in interactive mode.`,
    });
  }
  
  private executeSetupGithubCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Setup-Github command with args: "${args}". GitHub integration features are available in interactive mode.`,
      returnDisplay: `Setup-Github command with args: "${args}". GitHub integration features are available in interactive mode.`,
    });
  }
  
  private executeTerminalSetupCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Terminal-Setup command with args: "${args}". Terminal integration features are available in interactive mode.`,
      returnDisplay: `Terminal-Setup command with args: "${args}". Terminal integration features are available in interactive mode.`,
    });
  }
  
  private executeVimCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Vim command with args: "${args}". Vim mode features are available in interactive mode.`,
      returnDisplay: `Vim command with args: "${args}". Vim mode features are available in interactive mode.`,
    });
  }
  
  private executeApprovalModeCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Approval-Mode command with args: "${args}". Approval mode features are available in interactive mode.`,
      returnDisplay: `Approval-Mode command with args: "${args}". Approval mode features are available in interactive mode.`,
    });
  }
  
  private executePersonaCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Persona command with args: "${args}". Persona management features are available in interactive mode.`,
      returnDisplay: `Persona command with args: "${args}". Persona management features are available in interactive mode.`,
    });
  }
  
  private executeChainCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Chain command with args: "${args}". Command chain features are available in interactive mode.`,
      returnDisplay: `Chain command with args: "${args}". Command chain features are available in interactive mode.`,
    });
  }
  
  private executePromptCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Prompt command with args: "${args}". Prompt management features are available in interactive mode.`,
      returnDisplay: `Prompt command with args: "${args}". Prompt management features are available in interactive mode.`,
    });
  }
  
  private executeAgentsCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Agents command with args: "${args}". Agent management features are available in interactive mode.`,
      returnDisplay: `Agents command with args: "${args}". Agent management features are available in interactive mode.`,
    });
  }
  
  private executeCopyCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Copy command with args: "${args}". Copy features are available in interactive mode.`,
      returnDisplay: `Copy command with args: "${args}". Copy features are available in interactive mode.`,
    });
  }
  
  private executeRestoreCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Restore command with args: "${args}". Restore features are available in interactive mode.`,
      returnDisplay: `Restore command with args: "${args}". Restore features are available in interactive mode.`,
    });
  }
  
  private executeEditorCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Editor command with args: "${args}". Editor features are available in interactive mode.`,
      returnDisplay: `Editor command with args: "${args}". Editor features are available in interactive mode.`,
    });
  }
  
  private executeAboutCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `About command with args: "${args}". About features are available in interactive mode.`,
      returnDisplay: `About command with args: "${args}". About features are available in interactive mode.`,
    });
  }
  
  private executeCorgiCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Corgi command with args: "${args}". Corgi mode features are available in interactive mode.`,
      returnDisplay: `Corgi command with args: "${args}". Corgi mode features are available in interactive mode.`,
    });
  }
  
  private executeIdeCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `IDE command with args: "${args}". IDE integration features are available in interactive mode.`,
      returnDisplay: `IDE command with args: "${args}". IDE integration features are available in interactive mode.`,
    });
  }
  
  private executeInitCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Init command with args: "${args}". Init features are available in interactive mode.`,
      returnDisplay: `Init command with args: "${args}". Init features are available in interactive mode.`,
    });
  }
  
  private executeSummaryCommand(args: string): Promise<ToolResult> {
    return Promise.resolve({
      llmContent: `Summary command with args: "${args}". Summary features are available in interactive mode.`,
      returnDisplay: `Summary command with args: "${args}". Summary features are available in interactive mode.`,
    });
  }
  
  private async executeLsCommand(args: string): Promise<ToolResult> {
    try {
      // Default to current directory if no path provided
      const targetPath = args.trim() || '.';
      const absolutePath = path.resolve(this.config.getTargetDir(), targetPath);
      
      // Get the tool registry and find the list_directory tool
      const toolRegistry = this.config.getToolRegistry();
      const lsTool = toolRegistry.getTool('list_directory');
      
      if (!lsTool) {
        return {
          llmContent: 'Error: list_directory tool not found in tool registry',
          returnDisplay: 'Error: list_directory tool not found',
          error: {
            message: 'list_directory tool not found in tool registry',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }
      
      // Execute the list_directory tool
      const params = { path: absolutePath };
      const result = await lsTool.validateBuildAndExecute(params, new AbortSignal());
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error listing directory: ${errorMessage}`,
        returnDisplay: `Error listing directory: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
  
  private async executeCatCommand(args: string): Promise<ToolResult> {
    try {
      if (!args.trim()) {
        return {
          llmContent: 'Error: No file path provided. Usage: /cat <file_path>',
          returnDisplay: 'Error: No file path provided. Usage: /cat <file_path>',
          error: {
            message: 'No file path provided',
            type: ToolErrorType.INVALID_TOOL_PARAMS,
          },
        };
      }
      
      const absolutePath = path.resolve(this.config.getTargetDir(), args.trim());
      
      // Get the tool registry and find the read_file tool
      const toolRegistry = this.config.getToolRegistry();
      const readTool = toolRegistry.getTool('read_file');
      
      if (!readTool) {
        return {
          llmContent: 'Error: read_file tool not found in tool registry',
          returnDisplay: 'Error: read_file tool not found',
          error: {
            message: 'read_file tool not found in tool registry',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }
      
      // Execute the read_file tool
      const params = { absolute_path: absolutePath };
      const result = await readTool.validateBuildAndExecute(params, new AbortSignal());
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error reading file: ${errorMessage}`,
        returnDisplay: `Error reading file: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
  
  private async executeGrepCommand(args: string): Promise<ToolResult> {
    try {
      if (!args.trim()) {
        return {
          llmContent: 'Error: No pattern provided. Usage: /grep <pattern> [path]',
          returnDisplay: 'Error: No pattern provided. Usage: /grep <pattern> [path]',
          error: {
            message: 'No pattern provided',
            type: ToolErrorType.INVALID_TOOL_PARAMS,
          },
        };
      }
      
      // Parse the arguments: first word is the pattern, rest is optional path
      const argParts = args.trim().split(/\s+/);
      const pattern = argParts[0];
      const searchPath = argParts[1] ? path.resolve(this.config.getTargetDir(), argParts[1]) : undefined;
      
      // Get the tool registry and find the search_file_content tool
      const toolRegistry = this.config.getToolRegistry();
      const grepTool = toolRegistry.getTool('search_file_content');
      
      if (!grepTool) {
        return {
          llmContent: 'Error: search_file_content tool not found in tool registry',
          returnDisplay: 'Error: search_file_content tool not found',
          error: {
            message: 'search_file_content tool not found in tool registry',
            type: ToolErrorType.EXECUTION_FAILED,
          },
        };
      }
      
      // Execute the search_file_content tool
      const params = {
        pattern: pattern,
        path: searchPath
      };
      const result = await grepTool.validateBuildAndExecute(params, new AbortSignal());
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        llmContent: `Error searching for pattern: ${errorMessage}`,
        returnDisplay: `Error searching for pattern: ${errorMessage}`,
        error: {
          message: errorMessage,
          type: ToolErrorType.EXECUTION_FAILED,
        },
      };
    }
  }
}

export class EnhancedSlashCommandTool extends BaseDeclarativeTool<
  SlashCommandParams,
  ToolResult
> {
  static readonly NAME = 'slash_command_enhanced';

  constructor(private readonly config: Config) {
    super(
      EnhancedSlashCommandTool.NAME,
      'Execute enhanced slash commands',
      'Execute a wide range of slash commands that are available in the Qwen Code interface. These commands provide various utilities like clearing the screen, managing settings, accessing help, etc. This enhanced version supports many more commands than the basic slash_command tool.',
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