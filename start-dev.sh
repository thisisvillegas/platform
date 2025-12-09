#!/bin/bash

# Start both backend and frontend development servers in side-by-side terminals
# Usage: ./start-dev.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting development servers..."

# Check if we're on Windows (Git Bash, WSL, etc.)
if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ -n "$WINDIR" ]]; then
    # Windows - use Windows Terminal if available, otherwise cmd
    if command -v wt.exe &> /dev/null; then
        # Windows Terminal - open split panes side by side
        wt.exe -d "$SCRIPT_DIR/backend" cmd /k "npm run dev" \; split-pane -H -d "$SCRIPT_DIR/frontend" cmd /k "npm start"
    else
        # Fallback to regular cmd windows
        start cmd /k "cd /d $SCRIPT_DIR\backend && npm run dev"
        start cmd /k "cd /d $SCRIPT_DIR\frontend && npm start"
    fi
else
    # Unix-like systems
    if command -v gnome-terminal &> /dev/null; then
        # GNOME Terminal
        gnome-terminal --tab --working-directory="$SCRIPT_DIR/backend" -- bash -c "npm run dev; exec bash" \
                       --tab --working-directory="$SCRIPT_DIR/frontend" -- bash -c "npm start; exec bash"
    elif command -v tmux &> /dev/null; then
        # tmux - create side by side panes
        tmux new-session -d -s dev -c "$SCRIPT_DIR/backend" "npm run dev"
        tmux split-window -h -c "$SCRIPT_DIR/frontend" "npm start"
        tmux attach-session -t dev
    elif command -v osascript &> /dev/null; then
        # macOS - use Terminal.app
        osascript <<EOF
tell application "Terminal"
    do script "cd '$SCRIPT_DIR/backend' && npm run dev"
    do script "cd '$SCRIPT_DIR/frontend' && npm start"
end tell
EOF
    else
        # Fallback - run in background
        echo "Starting backend on port 3000..."
        (cd "$SCRIPT_DIR/backend" && npm run dev) &
        echo "Starting frontend on port 4200..."
        (cd "$SCRIPT_DIR/frontend" && npm start) &
        wait
    fi
fi

echo ""
echo "Development servers starting:"
echo "  Backend:  http://localhost:3000"
echo "  Frontend: http://localhost:4200"
