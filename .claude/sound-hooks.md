# Claude Code Sound Notification Hooks

This file contains custom hooks for Claude Code to play sound notifications when tasks are completed.

## Usage

Add to your Claude Code settings.json (in .claude/settings.json):

```json
{
  "hooks": {
    "task_complete": "afplay /Users/daniifrim/Downloads/IPHONE NOTIFICATION SOUND EFFECT (PING-DING).mp3",
    "task_error": "afplay /System/Library/Sounds/Glass.aiff",
    "task_success": "afplay /Users/daniifrim/Downloads/IPHONE NOTIFICATION SOUND EFFECT (PING-DING).mp3"
  }
}
```

## Available Hooks

- `task_complete`: Triggered when any task is completed
- `task_error`: Triggered when a task fails
- `task_success`: Triggered when a task succeeds

## Commands for Manual Testing

```bash
# Test the sound notification
afplay "/Users/daniifrim/Downloads/IPHONE NOTIFICATION SOUND EFFECT (PING-DING).mp3"

# Test system sounds
afplay /System/Library/Sounds/Glass.aiff
afplay /System/Library/Sounds/Ping.aiff
```