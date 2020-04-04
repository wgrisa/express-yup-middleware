import { ValidationError } from 'yup'

import { ErrorMessages, SchemaValidationInterface } from './schema-validation-interface'

export const validatePayload = async ({
  schemaValidator,
  payload,
  propertiesToValidate,
}: {
  schemaValidator: SchemaValidationInterface
  payload: any
  propertiesToValidate: string[]
}) => {
  const errors = {}

  for (const propertyToValidate of propertiesToValidate) {
    const propertySchema = schemaValidator[propertyToValidate]

    try {
      await propertySchema?.schema.validate(payload[propertyToValidate], propertySchema.validateOptions)
    } catch (yupValidationError) {
      errors[propertyToValidate] = buildErrorPayload({
        yupValidationError,
        errorMessages: schemaValidator.errorMessages,
      })
    }
  }

  return errors
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
