import { NextFunction, Request, Response } from 'express'
import { BAD_REQUEST } from 'http-status-codes'

import { SchemaValidationInterface } from './schema-validation-interface'
import { buildErrorPayload, validatePayload } from './schema-validator'

const validationKeys = ['params', 'body', 'query']

export const yupMiddleware = ({
  schemaValidator,
  statusCode,
}: {
  schemaValidator: SchemaValidationInterface
  statusCode?: number
}) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await validatePayload({ schemaValidator, payload: req, validationKeys })

    return next()
  } catch (validationError) {
    return res.status(statusCode || BAD_REQUEST).send({
      errors: buildErrorPayload({
        errorMessages: schemaValidator.errorMessages,
        validationError,
      }),
    })
  }
}
