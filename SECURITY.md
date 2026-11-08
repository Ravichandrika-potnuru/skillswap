# Security policy

## Reporting a vulnerability

Please do not report exploitable vulnerabilities in a public issue. Use GitHub's private vulnerability reporting for this repository when available. If it is not enabled, contact the repository owner through GitHub privately and include the affected area, impact, and steps to reproduce. Do not include credentials or real student data in the report.

There is no published response-time commitment yet.

## Handling secrets and user data

- Keep `.env.local`, database credentials, auth secrets, API keys, cookies, tokens, and demo passwords out of Git.
- If a credential is exposed, revoke or rotate it at its issuing service before cleaning files or history.
- Do not commit database dumps, production exports, real student profiles, or screenshots containing personal information.
- Use an isolated development Neon branch and fictional demo profiles for testing.
- Report suspected data exposure privately; do not copy the exposed value into an issue or pull request.
