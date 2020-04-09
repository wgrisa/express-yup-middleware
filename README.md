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
