#!/bin/bash

echo "Getting status..."
echo ""
echo ""

epic_name="$1"

if [ -z "$epic_name" ]; then
  echo "❌ Please specify an epic name"
  echo "Usage: /pm:epic-status <epic-name>"
  echo ""
  echo "Available epics:"
  for dir in .claude/epics/*/; do
    [ -d "$dir" ] && echo "  • $(basename "$dir")"
  done
  exit 1
else
  # Show status for specific epic
  epic_dir=".claude/epics/$epic_name"
  epic_file="$epic_dir/epic.md"

  if [ ! -f "$epic_file" ]; then
    echo "❌ Epic not found: $epic_name"
    echo ""
    echo "Available epics:"
    for dir in .claude/epics/*/; do
      [ -d "$dir" ] && echo "  • $(basename "$dir")"
    done
    exit 1
  fi

  echo "📚 Epic Status: $epic_name"
  echo "================================"
  echo ""

  # Extract metadata
  status=$(grep "^status:" "$epic_file" | head -1 | sed 's/^status: *//')
  progress=$(grep "^progress:" "$epic_file" | head -1 | sed 's/^progress: *//')
  github=$(grep "^github:" "$epic_file" | head -1 | sed 's/^github: *//')

  # Function to check if a dependency is satisfied
  check_dependency() {
    local dep_task="$1"
    local dep_file=""

    # Find the dependency task file - handle leading zeros
    for file in "$epic_dir"/[0-9]*.md; do
      [ -f "$file" ] || continue
      local task_num=$(basename "$file" .md | sed 's/^0*//')  # Remove leading zeros
      local dep_clean=$(echo "$dep_task" | sed 's/^0*//')      # Remove leading zeros from dep too
      if [ "$task_num" = "$dep_clean" ]; then
        dep_file="$file"
        break
      fi
    done

    if [ -z "$dep_file" ]; then
      return 1  # Dependency task not found
    fi

    local dep_status=$(grep "^status:" "$dep_file" | head -1 | sed 's/^status: *//')

    # Consider completed, closed, and in_progress as satisfied for dependency purposes
    if [ "$dep_status" = "completed" ] || [ "$dep_status" = "closed" ] || [ "$dep_status" = "in_progress" ]; then
      return 0  # Dependency satisfied
    else
      return 1  # Dependency not satisfied
    fi
  }

  # Count tasks with improved dependency checking
  total=0
  open=0
  closed=0
  in_progress=0
  blocked=0

  # First pass: collect all task statuses (removed associative array for compatibility)
  for task_file in "$epic_dir"/[0-9]*.md; do
    [ -f "$task_file" ] || continue
    task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
    total=$((total + 1))
  done

  # Second pass: categorize tasks with proper dependency checking
  for task_file in "$epic_dir"/[0-9]*.md; do
    [ -f "$task_file" ] || continue

    task_num=$(basename "$task_file" .md | sed 's/^0*//')  # Remove leading zeros
    task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
    deps_raw=$(grep "^depends_on:" "$task_file" | head -1 | sed 's/^depends_on: *\[//' | sed 's/\]//' | sed 's/, */ /g')

    if [ "$task_status" = "closed" ] || [ "$task_status" = "completed" ]; then
      closed=$((closed + 1))
    elif [ "$task_status" = "in_progress" ]; then
      in_progress=$((in_progress + 1))
    elif [ -n "$deps_raw" ] && [ "$deps_raw" != "depends_on:" ] && [ "$deps_raw" != "" ]; then
      # Check if all dependencies are satisfied
      all_deps_met=true

      for dep in $deps_raw; do
        # Remove any quotes or extra whitespace
        dep=$(echo "$dep" | sed 's/[", ]//g')
        [ -z "$dep" ] && continue

        if ! check_dependency "$dep"; then
          all_deps_met=false
          break
        fi
      done

      if $all_deps_met; then
        open=$((open + 1))  # Dependencies met, task is available
      else
        blocked=$((blocked + 1))  # Dependencies not met, task is blocked
      fi
    else
      open=$((open + 1))  # No dependencies, task is available
    fi
  done

  # Display progress bar (completed + partial credit for in-progress)
  if [ $total -gt 0 ]; then
    # Give full credit for completed, half credit for in-progress
    weighted_progress=$(( (closed * 100 + in_progress * 50) / total ))
    filled=$((weighted_progress * 20 / 100))
    partial=$((((closed * 100 + in_progress * 50) % total * 20) / total / 5))  # Partial fill for fractional progress
    empty=$((20 - filled - (partial > 0 ? 1 : 0)))

    echo -n "Progress: ["
    [ $filled -gt 0 ] && printf '%0.s█' $(seq 1 $filled)
    [ $partial -gt 0 ] && echo -n "▓"
    [ $empty -gt 0 ] && printf '%0.s░' $(seq 1 $empty)
    echo "] $weighted_progress%"
  else
    echo "Progress: No tasks created"
  fi

  echo ""
  echo "📊 Breakdown:"
  echo "  Total tasks: $total"
  echo "  ✅ Completed: $closed"
  echo "  🔄 In Progress: $in_progress"
  echo "  🟢 Available: $open"
  echo "  ⏸️ Blocked: $blocked"

  # Show detailed task breakdown
  echo ""
  echo "📋 Detailed Status:"

  # Collect tasks by status for detailed display
  completed_tasks=""
  in_progress_tasks=""
  available_tasks=""
  blocked_tasks=""

  for task_file in "$epic_dir"/[0-9]*.md; do
    [ -f "$task_file" ] || continue

    task_num=$(basename "$task_file" .md | sed 's/^0*//')  # Remove leading zeros
    task_name=$(grep "^name:" "$task_file" | head -1 | sed 's/^name: *//')
    task_status=$(grep "^status:" "$task_file" | head -1 | sed 's/^status: *//')
    deps_raw=$(grep "^depends_on:" "$task_file" | head -1 | sed 's/^depends_on: *\[//' | sed 's/\]//' | sed 's/, */ /g')

    if [ "$task_status" = "closed" ] || [ "$task_status" = "completed" ]; then
      completed_tasks="$completed_tasks  ✅ #$task_num: $task_name\n"
    elif [ "$task_status" = "in_progress" ]; then
      in_progress_tasks="$in_progress_tasks  🔄 #$task_num: $task_name\n"
    elif [ -n "$deps_raw" ] && [ "$deps_raw" != "depends_on:" ] && [ "$deps_raw" != "" ]; then
      # Check if all dependencies are satisfied
      all_deps_met=true
      unmet_deps=""

      for dep in $deps_raw; do
        dep=$(echo "$dep" | sed 's/[", ]//g')
        [ -z "$dep" ] && continue

        if ! check_dependency "$dep"; then
          all_deps_met=false
          unmet_deps="$unmet_deps $dep"
        fi
      done

      if $all_deps_met; then
        available_tasks="$available_tasks  🟢 #$task_num: $task_name\n"
      else
        blocked_tasks="$blocked_tasks  ⏸️ #$task_num: $task_name (waiting for:$unmet_deps)\n"
      fi
    else
      available_tasks="$available_tasks  🟢 #$task_num: $task_name\n"
    fi
  done

  [ -n "$completed_tasks" ] && echo -e "$completed_tasks"
  [ -n "$in_progress_tasks" ] && echo -e "$in_progress_tasks"
  [ -n "$available_tasks" ] && echo -e "$available_tasks"
  [ -n "$blocked_tasks" ] && echo -e "$blocked_tasks"

  [ -n "$github" ] && echo ""
  [ -n "$github" ] && echo "🔗 GitHub: $github"
fi

exit 0
