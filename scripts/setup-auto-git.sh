#!/bin/bash
# Pachacuti Auto-Git Setup
# Sets up multiple layers of automatic git commits

echo "🚀 Setting up Pachacuti Auto-Git System..."

# 1. Create the auto-commit script (already done)
echo "✓ Auto-commit script ready at scripts/auto-commit.sh"

# 2. Set up cron job for hourly commits
echo "Setting up hourly cron job..."

# Check if cron job already exists
if ! crontab -l 2>/dev/null | grep -q "pachacuti/scripts/auto-commit.sh"; then
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 * * * * /Users/Danallovertheplace/pachacuti/scripts/auto-commit.sh >/dev/null 2>&1") | crontab -
    echo "✓ Hourly cron job installed"
else
    echo "✓ Cron job already exists"
fi

# 3. Create git hook for commit on significant changes
echo "Installing git hooks..."
cat > ~/pachacuti/.git/hooks/post-commit << 'EOF'
#!/bin/bash
# Auto-push after commits
git push origin main 2>&1 &
EOF
chmod +x ~/pachacuti/.git/hooks/post-commit
echo "✓ Git hooks installed"

# 4. Create Claude session end hook
cat > ~/pachacuti/scripts/session-end-commit.sh << 'EOF'
#!/bin/bash
# Commit at end of Claude session

cd ~/pachacuti

# Check for changes
if [[ -n $(git status -s) ]]; then
    git add -A
    git commit -m "session: Claude session end - $(date +"%Y-%m-%d %H:%M")

Session completed. All work saved to repository.
Auto-committed by Pachacuti DevOps"
    
    git push origin main
    echo "✅ Session-end commit completed"
fi
EOF
chmod +x ~/pachacuti/scripts/session-end-commit.sh
echo "✓ Session-end script created"

# 5. Create quick manual commit command
cat > ~/pachacuti/scripts/quick-commit.sh << 'EOF'
#!/bin/bash
# Quick manual commit with smart message

cd ~/pachacuti
if [[ -n $(git status -s) ]]; then
    git add -A
    MESSAGE="${1:-Quick save}"
    git commit -m "manual: $MESSAGE - $(date +"%H:%M")"
    git push origin main
    echo "✅ Quick commit: $MESSAGE"
else
    echo "No changes to commit"
fi
EOF
chmod +x ~/pachacuti/scripts/quick-commit.sh

# 6. Add aliases to shell
echo "Adding shell aliases..."
echo "" >> ~/.bashrc
echo "# Pachacuti Git Aliases" >> ~/.bashrc
echo "alias pac-commit='~/pachacuti/scripts/quick-commit.sh'" >> ~/.bashrc
echo "alias pac-auto='~/pachacuti/scripts/auto-commit.sh'" >> ~/.bashrc
echo "alias pac-status='cd ~/pachacuti && git status'" >> ~/.bashrc
echo "✓ Aliases added to .bashrc"

echo ""
echo "✅ AUTO-GIT SYSTEM INSTALLED!"
echo ""
echo "Features enabled:"
echo "  • Hourly automatic commits (cron)"
echo "  • Auto-push after manual commits"
echo "  • Session-end commits"
echo "  • Quick commit commands"
echo ""
echo "Commands available:"
echo "  pac-commit [message] - Quick manual commit"
echo "  pac-auto            - Force auto-commit now"
echo "  pac-status          - Check git status"
echo ""
echo "The system will now automatically commit your work every hour!"