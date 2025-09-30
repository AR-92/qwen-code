# Qwen Code

**AI-powered command-line workflow tool for developers**

## Key Features

- **Code Understanding & Editing** - Query and edit large codebases beyond traditional context window limits
- **Workflow Automation** - Automate operational tasks like handling pull requests and complex rebases
- **Enhanced Parser** - Adapted parser specifically optimized for Qwen-Coder models
- **Vision Model Support** - Automatically detect images in your input and seamlessly switch to vision-capable models for multimodal analysis
- **Advanced Context Management** - Automatically manages conversation context length by cleaning up unnecessary context and extracting reusable knowledge
- **AI-Powered Intelligence** - Advanced intent recognition, predictive execution, and smart tool selection for "magical" user experience
- **Self-Learning System** - Continuously improves based on user interactions and outcomes

## Quick Start

```bash
# Install from npm
npm install -g @qwen-code/qwen-code@latest

# Start Qwen Code
qwen
```

### Session Management

- **`/compress`** - Compress conversation history to continue within token limits
- **`/clear`** - Clear all conversation history and start fresh
- **`/stats`** - Check current token usage and limits

## Commands & Shortcuts

- `/help` - Display available commands
- `/clear` - Clear conversation history
- `/compress` - Compress history to save tokens
- `/stats` - Show current session information
- `/exit` or `/quit` - Exit Qwen Code