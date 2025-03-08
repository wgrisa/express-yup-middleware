import { ValidationError as YupValidationError } from 'yup'

import {
  ErrorMessages,
  ExpressYupMiddlewareInterface,
  ValidationError,
  ValidationResult,
} from './schema-validation-interface'

export interface ValidatePayloadResult {
  errors: ValidationResult
  validatedData?: Record<string, any>
}

export const validatePayload = async ({
  schemaValidator,
  payload,
  propertiesToValidate,
  returnValidatedData = false,
}: {
  schemaValidator: ExpressYupMiddlewareInterface
  payload: any
  propertiesToValidate: string[]
  returnValidatedData?: boolean
}): Promise<ValidatePayloadResult> => {
  const errors: Record<string, ValidationError[]> = {}
  const validatedData: Record<string, any> = returnValidatedData ? {} : undefined

  for (const propertyToValidate of propertiesToValidate) {
    const propertySchema = schemaValidator.schema[propertyToValidate]

    if (!propertySchema) {
      continue
    }

    try {
      const validatedProperty = await propertySchema.yupSchema.validate(payload[propertyToValidate], {
        ...propertySchema.validateOptions,
        context: {
          payload,
          ...propertySchema.validateOptions?.context,
        },
      })

      // Store validated data if requested
      if (returnValidatedData) {
        validatedData[propertyToValidate] = validatedProperty
      }
    } catch (error) {
      const yupValidationError = error as YupValidationError
      errors[propertyToValidate] = buildErrorPayload({
        yupValidationError,
        errorMessages: schemaValidator.errorMessages,
      })
    }
  }

  return {
    errors: Object.keys(errors).length ? errors : null,
    validatedData: returnValidatedData ? validatedData : undefined,
  }
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
