#!/bin/bash
# Pachacuti Auto-Commit System
# Intelligent git commits with context awareness

cd ~/pachacuti

# Check if there are changes to commit
if [[ -n $(git status -s) ]]; then
    # Get change statistics
    CHANGES=$(git diff --numstat | wc -l | tr -d ' ')
    MODIFIED=$(git status -s | grep "^ M" | wc -l | tr -d ' ')
    ADDED=$(git status -s | grep "^??" | wc -l | tr -d ' ')
    DELETED=$(git status -s | grep "^ D" | wc -l | tr -d ' ')
    
    # Get top 3 changed files
    FILES=$(git status -s | head -3 | awk '{print $2}' | tr '\n' ', ' | sed 's/,$//')
    
    # Create smart commit message
    TIMESTAMP=$(date +"%Y-%m-%d %H:%M")
    
    # Determine commit type
    if [ "$ADDED" -gt "$MODIFIED" ]; then
        TYPE="feat"
    elif [ "$DELETED" -gt 0 ]; then
        TYPE="cleanup"
    else
        TYPE="update"
    fi
    
    # Stage all changes
    git add -A
    
    # Create commit with context
    git commit -m "$TYPE: Auto-commit $TIMESTAMP

Changes: $CHANGES files modified ($MODIFIED changed, $ADDED new, $DELETED removed)
Files: $FILES

Auto-committed by Pachacuti DevOps System
Session: $(whoami)@$(hostname)"
    
    # Push to GitHub
    git push origin main 2>&1
    
    echo "✅ Auto-commit successful: $CHANGES changes pushed to GitHub"
    
    # Log the commit
    echo "$(date): Auto-commit - $CHANGES changes" >> ~/.pachacuti-commits.log
else
    echo "ℹ️ No changes to commit"
fi