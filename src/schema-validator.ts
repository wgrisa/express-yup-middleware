import { ValidationError as YupValidationError } from 'yup'

import {
  ErrorMessages,
  ExpressYupMiddlewareInterface,
  ValidationError,
  ValidationResult,
} from './schema-validation-interface'

export const validatePayload = async ({
  schemaValidator,
  payload,
  propertiesToValidate,
}: {
  schemaValidator: ExpressYupMiddlewareInterface
  payload: any
  propertiesToValidate: string[]
}): Promise<ValidationResult> => {
  const errors: Record<string, ValidationError[]> = {}

  for (const propertyToValidate of propertiesToValidate) {
    const propertySchema = schemaValidator.schema[propertyToValidate]

    if (!propertySchema) {
      continue
    }

    try {
      await propertySchema.yupSchema.validate(payload[propertyToValidate], {
        ...propertySchema.validateOptions,
        context: {
          payload,
          ...propertySchema.validateOptions?.context,
        },
      })
    } catch (error) {
      const yupValidationError = error as YupValidationError
      errors[propertyToValidate] = buildErrorPayload({
        yupValidationError,
        errorMessages: schemaValidator.errorMessages,
      })
    }
  }

  return Object.keys(errors).length ? errors : null
}

const buildErrorPayload = ({
  errorMessages,
  yupValidationError,
}: {
  errorMessages?: ErrorMessages
  yupValidationError: YupValidationError
}): ValidationError[] => {
  const yupValidationResultErrors =
    yupValidationError.inner && yupValidationError.inner.length > 0 ? yupValidationError.inner : [yupValidationError]

  return yupValidationResultErrors.reduce<ValidationError[]>(
    (errorsResult, { path, message: yupErrorMessage }: YupValidationError) => {
      const propertyPath = path || 'unknown'

      if (errorsResult.find(({ propertyPath: accPropertyPath }) => accPropertyPath === propertyPath)) {
        return errorsResult
      }

      const errorMessage =
        errorMessages && yupErrorMessage && errorMessages[yupErrorMessage]
          ? errorMessages[yupErrorMessage]
          : { message: yupErrorMessage || 'Validation error' }

      return errorsResult.concat({
        ...errorMessage,
        propertyPath,
      })
    },
    [],
  )
}
