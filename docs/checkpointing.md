# Checkpointing

Qwen Code includes a Checkpointing feature that automatically saves a snapshot of your project's state before any file modifications are made by AI-powered tools.

## How It Works

When you approve a tool that modifies the file system, the CLI automatically creates a "checkpoint." This checkpoint includes:

1.  **A Git Snapshot:** A commit is made in a special, shadow Git repository located in your home directory.
2.  **Conversation History:** The entire conversation you've had with the agent up to that point is saved.
3.  **The Tool Call:** The specific tool call that was about to be executed is also stored.

If you want to undo the change, you can use the `/restore` command.

## Enabling the Feature

To enable checkpointing by default, add the following to your `settings.json`:

```json
{
  \"checkpointing\": {
    \"enabled\": true
  }
}
```

## Using the `/restore` Command

### List Available Checkpoints
```
/restore
```

### Restore a Specific Checkpoint
```
/restore <checkpoint_file>
```