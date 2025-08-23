#!/bin/bash
# Force set terminal title using multiple methods

TITLE="$1"
if [ -z "$TITLE" ]; then
    echo "Usage: bash set-terminal-title.sh 'TERMINAL #-DIRECTORY-TASK'"
    exit 1
fi

# Try all known terminal title escape sequences
echo -ne "\033]0;${TITLE}\007"        # Standard xterm
echo -ne "\033]1;${TITLE}\007"        # Icon name
echo -ne "\033]2;${TITLE}\007"        # Window title
echo -ne "\033]0;${TITLE}\a"          # Alternative ending
printf '\033]0;%s\007' "$TITLE"       # Printf method
printf '\033]2;%s\033\\' "$TITLE"     # Screen/tmux method

# For Terminal.app on macOS
if [[ "$TERM_PROGRAM" == "Apple_Terminal" ]]; then
    printf '\e]1;%s\a' "$TITLE"
    printf '\e]2;%s\a' "$TITLE"
fi

# For iTerm2
if [[ "$TERM_PROGRAM" == "iTerm.app" ]]; then
    echo -ne "\033]0;${TITLE}\007"
    printf "\033]0;%s\007" "$TITLE"
fi

echo "Terminal title set to: $TITLE"