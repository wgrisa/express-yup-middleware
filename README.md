# express-yup-middleware

[![npm version](https://badge.fury.io/js/express-yup-middleware.svg)](https://badge.fury.io/js/express-yup-middleware)

express-yup-middleware is an express middleware that uses Yup schemas to validate a request and return a response with errors.

## Basic schema validation

```ts
import { expressYupMiddleware } from 'express-yup-middleware'

import * as Yup from 'yup'

const schemaValidator = {
  schema: {
    query: {
      yupSchema: Yup.object().shape({
        testQueryParam: Yup.string().required('requiredTestQueryParam'),
      }),
    },
    body: {
      yupSchema: Yup.object().shape({
        testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
      }),
    },
    params: {
      yupSchema: Yup.object().shape({
        testParams: Yup.string().required('requiredTestParams'),
      }),
    },
  },
}

app.post('/test', expressYupMiddleware({ schemaValidator }))
```

```json
{
  "errors": {
    "params": [
      {
        "message": "requiredTestParams",
        "propertyPath": "testParams"
      }
    ],
    "body": [
      {
        "message": "requiredTestBodyProperty",
        "propertyPath": "testBodyProperty"
      }
    ],
    "query": [
      {
        "message": "requiredTestQueryParam",
        "propertyPath": "testQueryParam"
      }
    ]
  }
}
```

## Using YUP validation options

You can provide options to the property you are validating by using the `validateOptions` property.

YUP default configuration aborts early after a validation error. As you can see in the following example, you can change this configuration by sending `abortEarly: false` to the `validateOptions` property. There are [other options available](https://github.com/jquense/yup#mixedvalidatevalue-any-options-object-promiseany-validationerror).

```ts
const schemaValidator: ExpressYupMiddlewareInterface = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        firstTestBodyProperty: Yup.string().required('requiredFirstTestBodyProperty'),
        secondTestBodyProperty: Yup.string().required('requiredSecondTestBodyProperty'),
      }),
      validateOptions: {
        abortEarly: false,
      },
    },
  },
}
```

```json
{
  "errors": {
    "body": [
      {
        "message": "requiredFirstTestBodyProperty",
        "propertyPath": "firstTestBodyProperty"
      },
      {
        "message": "requiredSecondTestBodyProperty",
        "propertyPath": "secondTestBodyProperty"
      }
    ]
  }
}
```

## Setting custom error messages

Make sure the key in the Yup schema (requiredTestBodyProperty) matches the property name in the error messages object.

```ts
const schemaValidator = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
      }),
    },
  },
  errorMessages: {
    requiredTestBodyProperty: {
      key: 'tes-body-property-required',
      message: 'The "testBodyProperty" property is required!',
    },
  },
}
```

```json
{
  "errors": {
    "body": [
      {
        "key": "tes-body-property-required",
        "message": "The \"testBodyProperty\" property is required!",
        "propertyPath": "testBodyProperty"
      }
    ]
  }
}
```

## Cross-validation using any properties from your payload

You can cross-validate properties of your payload using a custom Yup test and accessing them by calling `this.options.context`.

```ts
const schemaValidator = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        numberToValidate: Yup.string().test({
          message: 'Check if your number corresponds with the given type',
          test(this: Yup.TestContext, numberToValidate: any) {
            const mod = numberToValidate % 2
            // As you can see in the next line, the req is passed to the context
            const type = this.options.context['payload'].params.type

            if (!type) {
              return false
            }

            if (type === 'even') {
              return mod === 0
            }

            if (type === 'odd') {
              return mod !== 0
            }

            return false
          },
        }),
      }),
    },
  },
}

app.post('/test/:type', expressYupMiddleware({ schemaValidator }))
```

## Validating a custom property in the request

The middleware default properties checked in the `req` (Express request) are body, params and query. If you want to validate anything else, you need to use the following option.

```ts
const schemaValidator = {
  schema: {
    headers: {
      yupSchema: Yup.object().shape({
        testHeaderProperty: Yup.string().required('requiredHeaderProperty'),
      }),
    },
  },
}

app.post('/test', expressYupMiddleware({ schemaValidator, propertiesToValidate: ['headers'] }))
```

```json
{
  "errors": {
    "headers": [
      {
        "message": "requiredHeaderProperty",
        "propertyPath": "testHeaderProperty"
      }
    ]
  }
}
```

## Using a custom error status code

Adding the `expectedStatusCode` option, your will receive the given status code if anything fails during the validation.

```ts
app.post('/test', expressYupMiddleware({ schemaValidator, expectedStatusCode: 418 }))
```

## New Features in Version 2.0.0

### Continue on Error

You can now configure the middleware to continue processing the request even if validation fails. This is useful when you want to validate the request but still allow it to proceed, storing the validation errors for later use.

```ts
app.post(
  '/test',
  expressYupMiddleware({
    schemaValidator,
    continueOnError: true,
    customContextKey: 'myValidationErrors', // optional, default is 'validationErrors'
  }),
)

// Later in your route handler
app.post('/test', (req, res) => {
  const validationErrors = req.myValidationErrors
  // Do something with validation errors
})
```

### Custom Error Formatter

You can provide a custom error formatter to change the format of the error response:

```ts
app.post(
  '/test',
  expressYupMiddleware({
    schemaValidator,
    errorFormatter: (errors) => ({
      status: 'error',
      validationErrors: errors,
      timestamp: new Date(),
    }),
  }),
)
```

### TypeScript Improvements

The package now includes improved TypeScript types for better developer experience:

```ts
import {
  expressYupMiddleware,
  ValidationError,
  ValidationResult,
  ExpressYupMiddlewareOptions,
} from 'express-yup-middleware'

// Use the types in your code
const errorFormatter = (errors: ValidationResult) => {
  // Custom formatting
}

const options: ExpressYupMiddlewareOptions = {
  schemaValidator,
  errorFormatter,
}
```

### Additional Data in Error Messages

You can now include additional data in your error messages:

```ts
const schemaValidator = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
      }),
    },
  },
  errorMessages: {
    requiredTestBodyProperty: {
      key: 'test-property-required',
      message: 'The property is required!',
      additionalData: {
        fieldType: 'string',
        importance: 'high',
        documentationUrl: 'https://example.com/docs/required-fields',
      },
    },
  },
}
```

## Accessing validated data in request handlers

You can store the validated and typed objects in the request for use in your handlers:

```ts
const schemaValidator = {
  schema: {
    body: {
      yupSchema: Yup.object().shape({
        email: Yup.string().email().required(),
        password: Yup.string().min(8).required(),
      }),
    },
  },
}

app.post(
  '/login',
  expressYupMiddleware({
    schemaValidator,
    storeValidatedData: true, // Enable storing validated data
    validatedDataKey: 'validated', // Optional: customize the property name (default is 'validated')
  }),
  (req, res) => {
    // Access the validated data with proper types
    const { email, password } = req.validated.body

    // Your handler logic here
    // ...
  },
)
```

This feature is particularly useful when working with TypeScript, as it gives you type-safe access to your validated data without having to call `validate()` again in your handler.

## Documentation

- [CHANGELOG](CHANGELOG.md) - Details about each release
- [MIGRATION GUIDE](MIGRATION.md) - Guide for migrating from v1.x to v2.0.0
- [PUBLISHING](PUBLISHING.md) - Guide for maintainers on how to publish new releases

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for discussion.
