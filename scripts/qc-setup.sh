#!/bin/bash

# Quick setup script for QC command
# Run this to add 'qc' as an alias

echo "📦 Setting up Quality Control command..."

# Create local bin directory
mkdir -p ~/bin

# Create the qc command
cat > ~/bin/qc << 'EOF'
#!/bin/bash

case "$1" in
    "control"|"")
        # Launch quality control in new window
        if [ -f "./scripts/quality-control.sh" ]; then
            ./scripts/quality-control.sh
        else
            echo "⚠️  QA scripts not found in current directory"
            echo "Make sure you're in the pachacuti project directory"
        fi
        ;;
    "confirm")
        # This would be handled inside the QA verifier terminal
        echo "⚠️  Use 'qc confirm' inside the QA verifier window"
        ;;
    "help")
        echo "Quality Control Commands:"
        echo "  qc / qc control  - Open QA verifier in new window"
        echo "  qc confirm       - (Use inside QA window) Verify agent summary"
        echo "  qc help          - Show this help"
        ;;
    *)
        echo "Unknown command: $1"
        echo "Use 'qc help' for available commands"
        ;;
esac
EOF

# Make it executable
chmod +x ~/bin/qc

# Add ~/bin to PATH if not already there
if [[ ":$PATH:" != *":$HOME/bin:"* ]]; then
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
    echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc 2>/dev/null
    export PATH="$HOME/bin:$PATH"
    echo "📝 Added ~/bin to PATH"
fi

# Create alias for immediate use
alias qc="~/bin/qc"

echo "✅ Setup complete!"
echo ""
echo "🎯 How to use:"
echo "1. After agent checkout, type: qc"
echo "2. New terminal opens with QA verifier"
echo "3. Copy the agent's work summary"
echo "4. In QA window, type: qc confirm \"[paste summary]\""
echo ""
echo "Note: The 'qc' command is now available in your current session."
echo "For new terminal sessions, it will be available automatically."