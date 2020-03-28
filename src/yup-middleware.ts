import { NextFunction, Request, Response } from 'express'
import { BAD_REQUEST } from 'http-status-codes'
import { ValidationError } from 'yup'

import { ErrorMessages, SchemaValidationInterface } from './schema-validation-interface'

const defaultValidateOptions = { abortEarly: false }

export const yupMiddleware = ({
  schemaValidator,
  statusCode,
}: {
  schemaValidator: SchemaValidationInterface
  statusCode?: number
}) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await validatePayload({ schemaValidator, payload: req })

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

const validatePayload = async ({
  schemaValidator,
  payload,
}: {
  schemaValidator: SchemaValidationInterface
  payload: any
}) => {
  const validationKeys = ['params', 'body', 'query']

  for (const validationKey of validationKeys) {
    const currentSchemaValidator = schemaValidator[validationKey]

    currentSchemaValidator &&
      currentSchemaValidator.schema &&
      (await currentSchemaValidator.schema.validate(payload[validationKey], {
        ...defaultValidateOptions,
        ...currentSchemaValidator.validateOptions,
      }))
  }
}

const buildErrorPayload = ({
  errorMessages,
  validationError,
}: {
  errorMessages: ErrorMessages
  validationError: ValidationError
}) => {
  const errors = validationError.inner && validationError.inner.length > 0 ? validationError.inner : [validationError]

  return errors.reduce((errorsAccumulator, { path: propertyPath, message }: ValidationError) => {
    if (errorsAccumulator.find(({ propertyPath: accPropertyPath }) => accPropertyPath === propertyPath)) {
      return errorsAccumulator
    }

    return errorsAccumulator.concat({
      ...errorMessages[message],
      propertyPath,
    })
  }, [])
}
