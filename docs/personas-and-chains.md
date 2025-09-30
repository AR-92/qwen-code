# Qwen Code - Prompt, Persona & Task Chain Management

## Prompt Templates

### Save a prompt template
```bash
qwen prompt save <name> [content] [-d description] [-t tag1,tag2]
```

### List prompt templates
```bash
qwen prompt list [-t tag]
```

## Personas

### Save a persona
```bash
qwen persona save <name> [systemPrompt] [-d description]
```

### Set/use a persona
```bash
qwen persona set <name>
```

## Task Chains

### Create a task chain
```bash
qwen chain create <name> [-d description] [-f file]
```

### Run a task chain
```bash
qwen chain run <name> [-c context]
```