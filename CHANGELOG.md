# Changelog

## [Unreleased]

### Fixed

- Active owners of one parent cannot total more than 100%. Add is blocked once that total is already at 100%. An edit cannot raise an over-100 total any higher; lowering it, terminating an owner, or saving other fields is still allowed.

### Changed

- Portal validate calls pass `parentRefNbr`, `editRefNbr`, and `operation` to `API_VALIDATE_OWNERSHIP_PORTAL` (v2.2 percent cap on existing STR/email rules). Deploy `accela-scripts/API_VALIDATE_OWNERSHIP_PORTAL.js` to Accela.
