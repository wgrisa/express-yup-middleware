import { ObjectSchema, ValidateOptions } from 'yup'

interface SchemaValidationInterface {
  [key: string]: {
    yupSchema: ObjectSchema
    validateOptions?: ValidateOptions
  }
}

export interface ErrorMessages {
  [key: string]: {
    key: string
    message: string
  }
}

export interface ExpressYupMiddlewareInterface {
  schema: SchemaValidationInterface
  errorMessages?: ErrorMessages
}
