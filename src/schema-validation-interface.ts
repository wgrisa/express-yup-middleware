import { AnySchema } from 'yup'
import { ValidateOptions } from 'yup/lib/types'

export interface SchemaWithOptions {
  /** The schema to use to validate */
  yupSchema: AnySchema
  /** Options to validate the schema with */
  validateOptions?: ValidateOptions
}

/**
 * The source of the data to validate
 *
 * * `body` The body of the request
 * * `query` The query string of the request
 * * `params` The params of the request
 * * `headers` The headers of the request
 */
export type SchemaValidationAreas<T> = {
  body?: T
  query?: T
  params?: T
  headers?: T
}

export interface ErrorMessages {
  [key: string]: {
    key: string
    message: string
  }
}

export interface ExpressYupMiddlewareInterface {
  schema: SchemaValidationAreas<SchemaWithOptions>
  errorMessages?: ErrorMessages
}
