import { NextFunction, Request, Response } from 'express'

import { ExpressYupMiddlewareInterface, ValidationResult } from './schema-validation-interface'
import { validatePayload } from './schema-validator'

const defaultPropertiesToValidate = ['params', 'body', 'query']

const BAD_REQUEST = 400

export interface ExpressYupMiddlewareOptions {
  schemaValidator: ExpressYupMiddlewareInterface
  expectedStatusCode?: number
  propertiesToValidate?: string[]
  errorFormatter?: (errors: ValidationResult) => any
  continueOnError?: boolean
  customContextKey?: string
}

export const expressYupMiddleware =
  ({
    schemaValidator,
    expectedStatusCode = BAD_REQUEST,
    propertiesToValidate = defaultPropertiesToValidate,
    errorFormatter,
    continueOnError = false,
    customContextKey,
  }: ExpressYupMiddlewareOptions) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = await validatePayload({
      schemaValidator,
      payload: req,
      propertiesToValidate,
    })

    if (!errors) {
      return next()
    }

    // Store validation errors in request object if continueOnError is true
    if (continueOnError) {
      req[customContextKey || 'validationErrors'] = errors
      return next()
    }

    // Use custom error formatter if provided
    const formattedErrors = errorFormatter ? errorFormatter(errors) : { errors }

    return res.status(expectedStatusCode).send(formattedErrors)
  }
