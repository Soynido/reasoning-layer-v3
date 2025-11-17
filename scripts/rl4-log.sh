#!/bin/bash
#
# RL4 Terminal Helper (Bash)
# 
# Source this file to get convenient functions for logging RL4 task events.
# 
# Usage:
#   source scripts/rl4-log.sh
#   rl4_task_start task-001 "npm test"
#   npm test
#   rl4_task_result task-001 success $?
# 
# Functions:
#   rl4_task_start <taskId> <command>
#   rl4_task_result <taskId> <status> <exitCode>
#   rl4_file_created <taskId> <filePath>
#   rl4_git_commit <taskId> <commitHash>
#

# Find workspace root (where .reasoning_rl4 exists)
_rl4_find_workspace_root() {
  local current_dir="$PWD"
  local max_depth=10
  local depth=0

  while [ $depth -lt $max_depth ]; do
    if [ -d "$current_dir/.reasoning_rl4" ]; then
      echo "$current_dir"
      return 0
    fi

    local parent_dir="$(dirname "$current_dir")"
    if [ "$parent_dir" = "$current_dir" ]; then
      # Reached filesystem root
      break
    fi
    current_dir="$parent_dir"
    depth=$((depth + 1))
  done

  # Fallback to current directory
  echo "$PWD"
}

# Append event to terminal-events.jsonl
_rl4_append_event() {
  local json_event="$1"
  local workspace_root="$(_rl4_find_workspace_root)"
  local events_file="$workspace_root/.reasoning_rl4/terminal-events.jsonl"

  # Ensure .reasoning_rl4 directory exists
  mkdir -p "$(dirname "$events_file")"

  # Append JSON line
  echo "$json_event" >> "$events_file"
  echo "[RL4] Event logged to: $events_file"
}

# Log task start
rl4_task_start() {
  if [ $# -lt 2 ]; then
    echo "Usage: rl4_task_start <taskId> <command>"
    return 1
  fi

  local task_id="$1"
  shift
  local command="$*"
  local timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

  local json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"command_start","taskId":"$task_id","command":"$command","terminal":"RL4"}
EOF
)

  _rl4_append_event "$json_event"
  
  # Also echo marker for manual parsing
  echo "# RL4_TASK_START id=$task_id command=\"$command\""
}

# Log task result
rl4_task_result() {
  if [ $# -lt 3 ]; then
    echo "Usage: rl4_task_result <taskId> <status> <exitCode>"
    return 1
  fi

  local task_id="$1"
  local status="$2"
  local exit_code="$3"
  local timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

  local json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"command_end","taskId":"$task_id","status":"$status","exitCode":$exit_code,"terminal":"RL4"}
EOF
)

  _rl4_append_event "$json_event"
  
  # Also echo marker for manual parsing
  echo "# RL4_TASK_RESULT id=$task_id status=$status exitCode=$exit_code"
}

# Log file created
rl4_file_created() {
  if [ $# -lt 2 ]; then
    echo "Usage: rl4_file_created <taskId> <filePath>"
    return 1
  fi

  local task_id="$1"
  local file_path="$2"
  local timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

  local json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"file_created","taskId":"$task_id","file":"$file_path","terminal":"RL4"}
EOF
)

  _rl4_append_event "$json_event"
  echo "# RL4_FILE_CREATED id=$task_id path=\"$file_path\""
}

# Log git commit
rl4_git_commit() {
  if [ $# -lt 2 ]; then
    echo "Usage: rl4_git_commit <taskId> <commitHash>"
    return 1
  fi

  local task_id="$1"
  local commit_hash="$2"
  local timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"

  local json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"git_commit","taskId":"$task_id","metadata":{"commit":"$commit_hash"},"terminal":"RL4"}
EOF
)

  _rl4_append_event "$json_event"
  echo "# RL4_GIT_COMMIT id=$task_id commit=$commit_hash"
}

# Helper: Run a command and automatically log start/end
rl4_run() {
  if [ $# -lt 2 ]; then
    echo "Usage: rl4_run <taskId> <command...>"
    return 1
  fi

  local task_id="$1"
  shift
  local command="$*"

  rl4_task_start "$task_id" "$command"
  
  # Run the command
  eval "$command"
  local exit_code=$?

  # Log result
  local status="success"
  if [ $exit_code -ne 0 ]; then
    status="failure"
  fi

  rl4_task_result "$task_id" "$status" "$exit_code"

  return $exit_code
}

# Export functions
export -f rl4_task_start
export -f rl4_task_result
export -f rl4_file_created
export -f rl4_git_commit
export -f rl4_run

# RL4_ACTION: Log ad-hoc actions (unplanned tasks)
# Usage: npm install axios  # RL4_ACTION: Add HTTP client for API calls
# This function is called automatically by parsing terminal output
rl4_action() {
  if [ $# -lt 1 ]; then
    echo "Usage: rl4_action <description>"
    return 1
  fi

  local description="$*"
  local timestamp="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
  
  # Log to terminal-events.jsonl with rl4_action metadata
  local json_event=$(cat <<EOF
{"timestamp":"$timestamp","type":"ad_hoc_action","metadata":{"rl4_action":"$description"},"terminal":"RL4"}
EOF
)

  _rl4_append_event "$json_event"
  echo "# RL4_ACTION: $description"
}

export -f rl4_action

echo "[RL4] Terminal helper loaded. Available functions:"
echo "  - rl4_task_start <taskId> <command>"
echo "  - rl4_task_result <taskId> <status> <exitCode>"
echo "  - rl4_file_created <taskId> <filePath>"
echo "  - rl4_git_commit <taskId> <commitHash>"
echo "  - rl4_run <taskId> <command...>  (auto-logs start/end)"
echo "  - rl4_action <description>  (log ad-hoc actions)"
echo ""
echo "💡 Tip: Use '# RL4_ACTION: description' as inline comment in commands:"
echo "   npm install axios  # RL4_ACTION: Add HTTP client"

