#!/bin/bash

# Fetch all commits on the current branch in chronological order
commits=$(git log --reverse --format="%h")
first_commit=true

echo "Starting to push commits one by one..."

for commit in $commits; do
  echo "-----------------------------------"
  echo "Pushing commit $commit to branch 'Roman'..."
  
  if [ "$first_commit" = true ]; then
    # Use --force on the first commit to overwrite the remote history
    git push --force origin $commit:refs/heads/Roman
    first_commit=false
  else
    # Standard push for subsequent commits
    git push origin $commit:refs/heads/Roman
  fi
  
  if [ $? -eq 0 ]; then
    echo "Successfully pushed $commit!"
  else
    echo "Failed to push $commit. Stopping the script."
    exit 1
  fi
  
  sleep 1
done

echo "All commits have been successfully pushed one by one!"
