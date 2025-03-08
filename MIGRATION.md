# Migration Guide from v1.x to v2.0.0

This guide helps you migrate your application from express-yup-middleware v1.x to v2.0.0.

## Overview

Version 2.0.0 is a major update that introduces several new features and improvements while maintaining backward compatibility with existing code. The main changes include updated dependencies, improved TypeScript types, and new options for customizing error handling.

## Dependency Updates

- **Yup**: Updated from 0.28.3 to 1.3.2
- **Express**: Updated from 4.17.3 to 4.18.2

### Yup Migration

The update to Yup 1.3.2 may require changes if you're using advanced Yup features. Refer to the [Yup migration guide](https://github.com/jquense/yup/blob/master/docs/migration-guide.md) for detailed information on migrating from older versions.

Key changes in Yup:

1. The shape() method API has changed slightly
2. The ValidationError format has changed in some cases
3. Some methods have been renamed or deprecated

Example of updated Yup usage:

```ts
// v1.x
const schema = Yup.object().shape({
  name: Yup.string().required(),
})

// v2.0.0 (still works, but can also use alternate syntax)
const schema = Yup.object({
  name: Yup.string().required(),
})
```

## New Features

### Continue on Error

You can now configure the middleware to continue processing the request even when validation fails:

```ts
app.post(
  '/test',
  expressYupMiddleware({
    schemaValidator,
    continueOnError: true,
    customContextKey: 'myValidationErrors', // Optional, default is 'validationErrors'
  }),
)

// Then in your route handler
app.post('/test', (req, res) => {
  const validationErrors = req.myValidationErrors
  if (validationErrors) {
    // Handle validation errors but continue processing
  }
  // Process valid request
})
```

### Custom Error Formatter

You can now customize the format of error responses:

```ts
app.post(
  '/test',
  expressYupMiddleware({
    schemaValidator,
    errorFormatter: (errors) => ({
      status: 'error',
      timestamp: new Date(),
      validationErrors: errors,
    }),
  }),
)
```

### Additional Data in Error Messages

You can now include additional data in your error messages for more context:

```ts
const schemaValidator = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        email: Yup.string().email().required('emailRequired'),
      }),
    },
  },
  errorMessages: {
    emailRequired: {
      key: 'email-required',
      message: 'Email is required',
      additionalData: {
        fieldType: 'email',
        importance: 'high',
        documentationUrl: 'https://example.com/docs/email-validation',
      },
    },
  },
}
```

## TypeScript Improvements

If you're using TypeScript, you'll benefit from improved types:

```ts
import {
  expressYupMiddleware,
  ExpressYupMiddlewareOptions,
  ValidationError,
  ValidationResult,
} from 'express-yup-middleware'

// Use the types in your code
const errorFormatter = (errors: ValidationResult) => {
  // Custom formatting logic
}

const options: ExpressYupMiddlewareOptions = {
  schemaValidator,
  errorFormatter,
}
```

## Breaking Changes

There are no significant breaking changes for normal usage patterns. All v1.x code should continue to work without modification.

If you encounter any issues during migration, please [open an issue](https://github.com/wgrisa/express-yup-middleware/issues).
