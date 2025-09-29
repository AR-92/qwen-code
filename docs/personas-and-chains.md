# Qwen Code - Prompt, Persona & Task Chain Management

This document explains how to use the new features for managing prompts, personas, and task chains in Qwen Code.

## Table of Contents
1. [Prompt Templates](#prompt-templates)
2. [Personas](#personas)
3. [Task Chains](#task-chains)
4. [Examples](#examples)

## Prompt Templates

Prompt templates allow you to save, reuse, and manage commonly used prompts.

### Commands

#### Save a prompt template
```bash
qwen prompt save <name> [content] [-d description] [-t tag1,tag2]
```

Example:
```bash
qwen prompt save review-code "Please review this code for best practices, security issues, and performance improvements." -d "Code review template" -t code,review
```

Or from stdin:
```bash
cat my-prompt.txt | qwen prompt save review-code -d "Code review template" -t code,review
```

#### List prompt templates
```bash
qwen prompt list [-t tag]
```

#### Edit a prompt template
```bash
qwen prompt edit <name> [-e editor]
```

This opens the prompt in your specified editor (default: nvim).

#### Get a prompt template
```bash
qwen prompt get <name>
```

#### Delete a prompt template
```bash
qwen prompt delete <name>
```

## Personas

Personas allow you to save and switch between different AI personalities with custom system prompts.

### Commands

#### Save a persona
```bash
qwen persona save <name> [systemPrompt] [-d description] [-s settings]
```

Example:
```bash
qwen persona save code-reviewer "You are an expert code reviewer. Focus on best practices, security, and performance." -d "Code review expert"
```

#### List personas
```bash
qwen persona list
```

#### Set/use a persona
```bash
qwen persona set <name>
```

This changes the current persona for new sessions.

#### Edit a persona
```bash
qwen persona edit <name> [-e editor]
```

#### Get a persona
```bash
qwen persona get <name>
```

#### Delete a persona
```bash
qwen persona delete <name>
```

## Task Chains

Task chains allow you to define sequences of commands with conditional execution logic.

### Commands

#### Create a task chain
```bash
qwen chain create <name> [-d description] [-t tag1,tag2] [-f file]
```

Example with file:
```bash
qwen chain create build-process -d "Complete build process" -f build-chain.json
```

#### List task chains
```bash
qwen chain list [-t tag]
```

#### Edit a task chain
```bash
qwen chain edit <name> [-e editor]
```

#### Get a task chain
```bash
qwen chain get <name>
```

#### Delete a task chain
```bash
qwen chain delete <name>
```

#### Run a task chain
```bash
qwen chain run <name> [-c context]
```

Example:
```bash
qwen chain run build-process -c '{"env": "production", "branch": "main"}'
```

## Examples

### Example 1: Creating a Development Workflow

1. Save a code review prompt:
```bash
qwen prompt save code-review "Please review this code focusing on:
- Code quality and best practices
- Security vulnerabilities
- Performance implications
- Maintainability"
```

2. Create a task chain for your development workflow:
```bash
qwen chain create dev-workflow -f dev-workflow.json
```

dev-workflow.json:
```json
{
  "tasks": [
    {
      "id": "lint",
      "name": "Run Linter",
      "command": "npm",
      "args": ["run", "lint"],
      "onSuccess": "test",
      "onFailure": "exit-lint-error"
    },
    {
      "id": "test",
      "name": "Run Tests",
      "command": "npm",
      "args": ["run", "test"],
      "onSuccess": "build",
      "onFailure": "exit-test-error"
    },
    {
      "id": "build",
      "name": "Build Project",
      "command": "npm",
      "args": ["run", "build"]
    },
    {
      "id": "exit-lint-error",
      "name": "Handle Lint Error",
      "command": "echo",
      "args": ["Linter failed, please fix errors before continuing"]
    },
    {
      "id": "exit-test-error",
      "name": "Handle Test Error",
      "command": "echo",
      "args": ["Tests failed, please fix errors before continuing"]
    }
  ],
  "startTaskId": "lint"
}
```

3. Run the workflow:
```bash
qwen chain run dev-workflow
```

### Example 2: Using Personas

1. Create a debugging persona:
```bash
qwen persona save debugger "You are an expert debugger. Focus on identifying the root cause of issues, suggest specific fixes, and consider edge cases."
```

2. Switch to the debugging persona:
```bash
qwen persona set debugger
```

3. Now all new qwen sessions will use the debugger persona.

### Example 3: Complex Task Chain with Conditions

```json
{
  "tasks": [
    {
      "id": "check-env",
      "name": "Check Environment",
      "command": "node",
      "args": ["-e", "console.log(process.env.NODE_ENV || 'development')"],
      "onSuccess": "dev-tasks"
    },
    {
      "id": "dev-tasks",
      "name": "Development Tasks",
      "command": "echo",
      "args": ["Running in development mode"],
      "conditions": [
        {
          "type": "output_contains",
          "value": "development"
        }
      ]
    }
  ],
  "startTaskId": "check-env",
  "context": {
    "project": "my-app"
  }
}
```

## Data Storage

All prompts, personas, and task chains are stored in `~/.qwen/`:

- Prompt templates: `~/.qwen/prompts/templates/`
- Personas: `~/.qwen/prompts/personas/`
- Task chains: `~/.qwen/chains/`

Each item is stored as a JSON file with metadata.

## Variables in Prompts and Task Chains

You can use variables in prompts and task chains:

- `{{variable}}` or `${variable}` format
- Variables are substituted at runtime using context

Example prompt with variables:
```
Analyze the {{file_type}} file {{file_name}} for {{concerns}}.
```

Example task with variables:
```json
{
  "id": "analyze-file",
  "command": "cat",
  "args": ["{{file_path}}"]
}
```

When running a chain, you can pass context:
```bash
qwen chain run analyze -c '{"file_path": "/src/app.js", "file_type": "JavaScript", "concerns": "security issues"}'
```