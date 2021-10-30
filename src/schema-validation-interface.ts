import { Shape, ValidateOptions } from 'yup'

interface SchemaValidationInterface {
  [key: string]: {
    yupSchema: Shape<any, any>
    validateOptions?: ValidateOptions,
    overrideProperty: boolean
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
