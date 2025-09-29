# Using Slash Commands with AI in Qwen Code

## Overview
Qwen Code now supports slash commands accessible both through direct user interaction and through AI tool calling. This enables AI agents to leverage the full power of Qwen Code's built-in commands to assist users more effectively.

## Slash Command Tool for AI
The system includes a special `slash_command` tool that AI can use to identify and suggest slash commands to users. When AI uses this tool, it helps users understand what slash commands are available and when to use them.

### Tool Schema
```json
{
  "name": "slash_command",
  "description": "Execute slash commands that are available in the Qwen Code interface. These commands provide various utilities like clearing the screen, managing settings, accessing help, etc.",
  "parameters": {
    "type": "object",
    "properties": {
      "command": {
        "type": "string",
        "description": "The slash command to execute (without the leading slash)"
      },
      "args": {
        "type": "string",
        "description": "Optional arguments for the slash command"
      }
    },
    "required": ["command"]
  }
}
```

## Available Slash Commands

### Help & Information
- `/help` or `/?` - Display help information
- `/about` - Show information about Qwen Code
- `/stats` - Display session statistics
- `/tools` - List available Qwen Code tools
- `/tools desc` - List tools with descriptions

### Session Management
- `/clear` - Clear the conversation history
- `/quit` - Quit the application
- `/quit confirm` - Show quit confirmation dialog
- `/chat save <tag>` - Save current conversation
- `/chat resume <tag>` - Resume a saved conversation

### Memory & Context
- `/memory show` - Display current memory content
- `/memory add <path>` - Add files to memory
- `/memory clear` - Clear current memory
- `/memory refresh` - Refresh memory from workspace
- `/memory exclude <path>` - Exclude paths from memory

### Settings & Configuration
- `/settings` - Open settings dialog
- `/theme` - Open theme selection
- `/model` - Open model selection
- `/auth` - Open authentication settings
- `/editor` - Open editor settings

### Development Tools
- `/git <subcommand>` - Execute git commands
- `/ls [path]` - List directory contents
- `/cat <file>` - Display file contents
- `/find <path> -name <pattern>` - Find files by name
- `/grep <pattern> [files]` - Search for patterns in files

### Advanced Features
- `/vim` - Toggle vim mode
- `/corgi` - Toggle corgi mode
- `/summary` - Generate conversation summary
- `/compress` - Compress conversation history
- `/approval-mode <mode>` - Change approval mode (plan, default, auto-edit, yolo)

## How AI Uses Slash Commands

AI can suggest slash commands in two ways:

1. By using the `slash_command` tool to identify what slash commands would be useful in a given context
2. By recommending users to execute specific slash commands for better workflow

For example, if the conversation history is getting long, the AI might suggest `/compress` to summarize the conversation and reduce token usage.

## Best Practices

- Use `/memory refresh` to ensure the AI has the most up-to-date context about your codebase
- Use `/chat save` to preserve important conversations for later reference
- Use `/clear` when starting a new task to keep focus
- Use `/quit` when finished to properly close the session