# Changelog

All notable changes to express-yup-middleware will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2023-12-14

### Added

- New `continueOnError` option to allow requests to proceed even when validation fails
- New `customContextKey` option to customize where validation errors are stored in the request object
- New `errorFormatter` option to customize the format of validation error responses
- Support for `additionalData` in error messages to provide more context about validation errors
- Improved TypeScript types for better developer experience
- Comprehensive test suite with 100% code coverage

### Changed

- Updated Yup dependency from 0.28.3 to 1.3.2
- Updated Express dependency from 4.17.3 to 4.18.2
- Improved error handling for null or undefined values
- Enhanced validation error messages
- More specific type definitions with better TypeScript support

### Fixed

- Fixed handling of validation errors with undefined paths
- Improved error message consistency

## [1.2.4] - 2022-03-15

### Changed

- Update dependencies to fix security vulnerabilities

## [1.2.3] - 2021-08-31

### Added

- Initial stable release
