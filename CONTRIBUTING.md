# Contributing

Thanks for helping improve SkillSwap. Keep changes focused, preserve the existing Neon Auth and database architecture, and avoid including private user data.

## Local development

1. Follow [docs/SETUP.md](docs/SETUP.md) to configure an isolated development Neon branch.
2. Create a feature branch from `main`.
3. Make the smallest change that addresses the issue.
4. Run the relevant checks before opening a pull request:

   ```powershell
   npm run lint
   npm run test:auth
   npm run build
   ```

5. Describe the behavior changed, how it was verified, and any migration or configuration requirements.

## Database changes

- Update `database/schema.js` and generate or edit a reviewed migration with Drizzle.
- Test migrations against a development branch before applying them elsewhere.
- Do not commit connection strings, database dumps, production records, or demo passwords.
- Do not reset, reseed, or change production data as part of a pull request.

## Pull requests

- Explain the user-visible change and include non-sensitive screenshots where they help review it.
- Note any auth, role-protection, data-integrity, or accessibility implications.
- Keep demo fixtures fictional and clearly marked as demo content.
- Do not add a license or change repository-wide policy without maintainers' agreement.
