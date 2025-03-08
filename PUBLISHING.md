# Publishing Guide for express-yup-middleware

This document outlines the steps required to publish a new version of `express-yup-middleware` to npm.

## Publishing Process

### 1. Update Version Number

- Edit `package.json` and update the version number following [Semantic Versioning](https://semver.org/)
  - **Major version (x.0.0)**: Breaking changes that require users to modify their code
  - **Minor version (0.x.0)**: New features added in a backward-compatible manner
  - **Patch version (0.0.x)**: Backward-compatible bug fixes
- For version 2.x, ensure the version begins with "2.x.x"

### 2. Update Documentation

- Ensure README.md is up-to-date with the latest features and API changes
- Update CHANGELOG.md with details about the new release
  - Include changes, bug fixes, and new features
  - Group changes by type (Breaking Changes, Features, Bug Fixes, etc.)
- If there are breaking changes, update or create a MIGRATION.md guide
  - Document the changes required for users to upgrade
  - Provide code examples showing before and after

### 3. Testing

- Run tests to ensure everything works: `yarn test:ci`
- Check test coverage: `yarn test:coverage`
- Manually verify key functionality if needed
- Make sure all CI checks pass

### 4. Build & Publish

- Run `yarn build` to build the package (generates the dist folder)
  - Note: The dist folder is automatically ignored by ESLint via .eslintignore
- Run `npm publish` to publish to npm registry
  - Note: The `prepublishOnly` script will automatically run lint, tests, and build before publishing
- If you're publishing a pre-release version, use `npm publish --tag beta` (or another appropriate tag)

## Troubleshooting

- If npm publish fails due to authentication issues, run `npm login` first
- If you need to unpublish a version (within 72 hours), use `npm unpublish express-yup-middleware@<version>`
- For other issues, consult the [npm documentation](https://docs.npmjs.com/)

## Release Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Update/verify README.md is current
- [ ] Update MIGRATION.md (if needed)
- [ ] Run tests and verify they pass
- [ ] Build and publish to npm
- [ ] Create GitHub release
- [ ] Announce release (if significant)
