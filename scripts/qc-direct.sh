#!/bin/bash

# Direct QA confirmation script - processes agent summaries directly

if [ "$1" == "confirm" ]; then
    shift  # Remove 'confirm' from arguments
    
    # Pass the summary directly to the QA verifier
    if [ -f "./scripts/qa-verifier.js" ]; then
        echo "$@" | node ./scripts/qa-verifier.js confirm
    else
        echo "⚠️  QA verifier not found in current directory"
        exit 1
    fi
else
    # Run normal QA verifier
    node ./scripts/qa-verifier.js "$@"
fi