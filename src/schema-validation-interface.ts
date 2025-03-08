import { Schema, ValidateOptions } from 'yup'

interface SchemaValidationInterface {
  [key: string]: {
    yupSchema: Schema<any>
    validateOptions?: ValidateOptions
  }
}

export interface ErrorMessages {
  [key: string]: {
    key: string
    message: string
    additionalData?: Record<string, unknown>
  }
}

export interface ValidationError {
  message: string
  propertyPath: string
  key?: string
  additionalData?: Record<string, unknown>
}

export type ValidationResult = Record<string, ValidationError[]> | null

export interface ExpressYupMiddlewareInterface {
  schema: SchemaValidationInterface
  errorMessages?: ErrorMessages
}
