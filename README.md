# Chart-Editor
Creating professional, data-driven charts

## Overview
Chart Editor is a simple, web-based tool for creating professional, data-driven charts. It supports multiple chart types including bar charts, line charts, pie charts, and doughnut charts.

## Features
- Multiple chart types (Bar, Line, Pie, Doughnut)
- Easy data input
- Real-time chart preview
- Customizable chart titles and labels
- Responsive design

## Usage
Simply open `index.html` in a web browser to start using the Chart Editor.

1. Select your desired chart type
2. Enter your chart title
3. Input your data labels (comma-separated)
4. Input your data values (comma-separated)
5. Click "Update Chart" to see your visualization

## Fixing `gitsafe` errors when pushing from a local clone
If you originally worked on this project in Replit and now use a local editor (e.g., Cursor), Git may still try to route traffic through Replit's `gitsafe` proxy, producing errors like `fatal: unable to look up gitsafe (port 5418)`. To push directly to GitHub:

1. Remove the Replit-specific rewrite:  
   `git config --global --unset-all url."gitsafe://".insteadOf`  
   (run this command even if it reports that nothing was unset).
2. Point `origin` at GitHub:  
   `git remote set-url origin https://github.com/martin-murray/Chart-Editor.git`
3. Confirm the remote:  
   `git remote -v`  
   The URL should show `github.com` and no longer mention `gitsafe`.

## Completing GitHub device authentication prompts (e.g., in Cursor)
If a Git command in Cursor shows a one-time code like `20B1-84A2` and asks you to finish authenticating:
1. Copy the code from the prompt.
2. In a browser, open https://github.com/login/device (or click the link shown in the prompt).
3. Paste the code, authorize access, and finish the flow.
4. Return to Cursor; the Git command continues once authorization is complete.

## Technologies
- HTML5
- CSS3
- JavaScript
- Canvas API
