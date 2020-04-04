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
  const errors =
    yupValidationError.inner && yupValidationError.inner.length > 0 ? yupValidationError.inner : [yupValidationError]

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
