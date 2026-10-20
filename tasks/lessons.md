# Engineering lessons

- Use the installed, sandbox-enabled Chrome explicitly on this host; downloaded Chromium can fail before navigation with “No usable sandbox”.
- Ad-heavy source pages may reach the correct URL and render the complete forecast while full-page load times out. Check exact origin/path and complete row readiness before continuing; do not suppress other navigation errors.
- systemd EnvironmentFile keeps quote characters in the path on this host. Render the absolute path without surrounding quotes, escape percent specifiers, and verify the actual generated units with systemd-analyze.
