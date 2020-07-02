import { ValidationError } from 'yup'

import { ErrorMessages, ExpressYupMiddlewareInterface } from './schema-validation-interface'

export const validatePayload = async ({
  schemaValidator,
  payload,
  propertiesToValidate,
}: {
  schemaValidator: ExpressYupMiddlewareInterface
  payload: any
  propertiesToValidate: string[]
}) => {
  const errors = {}

  for (const propertyToValidate of propertiesToValidate) {
    const propertySchema = schemaValidator.schema[propertyToValidate]

    try {
      await propertySchema?.yupSchema.validate(payload[propertyToValidate], {
        ...propertySchema.validateOptions,
        context: {
          payload,
          ...propertySchema.validateOptions?.context,
        },
      })
    } catch (yupValidationError) {
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
  errorMessages: ErrorMessages
  yupValidationError: ValidationError
}) => {
  const yupValidationResultErrors =
    yupValidationError.inner && yupValidationError.inner.length > 0 ? yupValidationError.inner : [yupValidationError]

  return yupValidationResultErrors.reduce(
    (errorsResult, { path: propertyPath, message: yupErrorMessage }: ValidationError) => {
      if (errorsResult.find(({ propertyPath: accPropertyPath }) => accPropertyPath === propertyPath)) {
        return errorsResult
      }

      const errorMessage = errorMessages ? errorMessages[yupErrorMessage] : { message: yupErrorMessage }

      return errorsResult.concat({
        ...errorMessage,
        propertyPath,
      })
    },
    [],
  )
}
