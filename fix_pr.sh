#!/bin/bash

echo "Fetching latest changes from GitHub..."
git fetch origin

echo "Merging the remote main branch into our local branch (allowing unrelated histories)..."
# We use --allow-unrelated-histories to tell Git it's OK that they started differently
git merge origin/main --allow-unrelated-histories -m "Merge remote main to fix unrelated histories for PR"

if [ $? -ne 0 ]; then
    echo "Merge conflict detected! We will prioritize your local files."
    # If there's a conflict (e.g. .DS_Store), we accept our local changes
    git checkout --ours .
    git add .
    git commit -m "Resolve merge conflicts by keeping local files"
fi

echo "Pushing the merged history to the Roman branch..."
git push origin HEAD:refs/heads/Roman

echo "Done! You can now refresh the GitHub page and create the Pull Request."
