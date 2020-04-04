import { ValidationError } from 'yup'

import { ErrorMessages, SchemaValidationInterface } from './schema-validation-interface'

const defaultValidateOptions = { abortEarly: false }

export const validatePayload = async ({
  schemaValidator,
  payload,
  validationKeys,
}: {
  schemaValidator: SchemaValidationInterface
  validationKeys: string[]
  payload: any
}) => {
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

export const buildErrorPayload = ({
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
