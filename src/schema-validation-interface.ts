import { ObjectSchema, ValidateOptions } from 'yup'

export interface SchemaValidator {
  schema: ObjectSchema
  validateOptions?: ValidateOptions
}

export interface SchemaValidationInterface {
  body?: SchemaValidator
  params?: SchemaValidator
  query?: SchemaValidator
  errorMessages?: ErrorMessages
}

export interface ErrorMessages {
  [key: string]: any
}
