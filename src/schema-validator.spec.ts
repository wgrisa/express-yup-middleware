import * as Yup from 'yup'
import { ValidationError } from 'yup'
import { ExpressYupMiddlewareInterface } from './schema-validation-interface'
import { validatePayload } from './schema-validator'

describe('schema-validator', () => {
  describe('validatePayload', () => {
    it('should return null when no validation errors are found', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
            }),
          },
        },
      }
      const payload = {
        body: {
          name: 'John Doe',
        },
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).toBeNull()
    })

    it('should return validation errors when validation fails', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('body')
      expect(result?.body[0]).toHaveProperty('propertyPath', 'name')
      expect(result?.body[0]).toHaveProperty('message', 'nameRequired')
    })

    it('should skip validation if schema for property is not defined', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
            }),
          },
        },
      }
      const payload = {
        query: {
          search: '',
        },
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['query'],
      })

      // Assert
      expect(result).toBeNull()
    })

    it('should validate multiple properties', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
          query: {
            yupSchema: Yup.object().shape({
              search: Yup.string().required('searchRequired'),
            }),
          },
        },
      }
      const payload = {
        body: {},
        query: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body', 'query'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result).toHaveProperty('body')
      expect(result).toHaveProperty('query')
      expect(result?.body[0]).toHaveProperty('message', 'nameRequired')
      expect(result?.query[0]).toHaveProperty('message', 'searchRequired')
    })

    it('should use custom error messages when provided', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
        },
        errorMessages: {
          nameRequired: {
            key: 'name-is-required',
            message: 'Name is a required field',
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body[0]).toHaveProperty('key', 'name-is-required')
      expect(result?.body[0]).toHaveProperty('message', 'Name is a required field')
    })

    it('should use additionalData when provided in error messages', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
        },
        errorMessages: {
          nameRequired: {
            key: 'name-is-required',
            message: 'Name is a required field',
            additionalData: {
              fieldType: 'string',
              importance: 'high',
            },
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body[0]).toHaveProperty('additionalData')
      expect(result?.body[0].additionalData).toEqual({
        fieldType: 'string',
        importance: 'high',
      })
    })

    it('should handle validation errors with undefined path', async () => {
      // Arrange
      const mockValidationError = new ValidationError('validation error', 'invalid value', 'field')
      mockValidationError.path = undefined // Explicitly set path to undefined

      const mockYupSchema = {
        validate: jest.fn().mockRejectedValue(mockValidationError),
      }

      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            // @ts-expect-error - We're mocking the Yup schema
            yupSchema: mockYupSchema,
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body[0]).toHaveProperty('propertyPath', 'unknown')
      expect(result?.body[0]).toHaveProperty('message', 'validation error')
    })

    it('should handle validation errors with null message', async () => {
      // Arrange
      const mockValidationError = new ValidationError(null as any, 'invalid value', 'field')
      mockValidationError.path = 'fieldName'

      const mockYupSchema = {
        validate: jest.fn().mockRejectedValue(mockValidationError),
      }

      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            // @ts-expect-error - We're mocking the Yup schema
            yupSchema: mockYupSchema,
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body[0]).toHaveProperty('propertyPath', 'fieldName')
      expect(result?.body[0]).toHaveProperty('message', 'Validation error')
    })

    it('should handle inner validation errors', async () => {
      // Arrange
      const mockValidationError = new ValidationError('outer error', 'invalid value', 'field')
      mockValidationError.path = 'outerField'

      const innerError1 = new ValidationError('inner error 1', 'invalid value', 'field')
      innerError1.path = 'innerField1'

      const innerError2 = new ValidationError('inner error 2', 'invalid value', 'field')
      innerError2.path = 'innerField2'

      mockValidationError.inner = [innerError1, innerError2]

      const mockYupSchema = {
        validate: jest.fn().mockRejectedValue(mockValidationError),
      }

      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            // @ts-expect-error - We're mocking the Yup schema
            yupSchema: mockYupSchema,
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body).toHaveLength(2)
      expect(result?.body[0]).toHaveProperty('propertyPath', 'innerField1')
      expect(result?.body[0]).toHaveProperty('message', 'inner error 1')
      expect(result?.body[1]).toHaveProperty('propertyPath', 'innerField2')
      expect(result?.body[1]).toHaveProperty('message', 'inner error 2')
    })

    it('should avoid duplicate errors for the same property path', async () => {
      // Arrange
      const mockValidationError = new ValidationError('outer error', 'invalid value', 'field')

      const innerError1 = new ValidationError('inner error 1', 'invalid value', 'field')
      innerError1.path = 'innerField'

      const innerError2 = new ValidationError('inner error 2', 'invalid value', 'field')
      innerError2.path = 'innerField' // Same property path as innerError1

      mockValidationError.inner = [innerError1, innerError2]

      const mockYupSchema = {
        validate: jest.fn().mockRejectedValue(mockValidationError),
      }

      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            // @ts-expect-error - We're mocking the Yup schema
            yupSchema: mockYupSchema,
          },
        },
      }
      const payload = {
        body: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result).not.toBeNull()
      expect(result?.body).toHaveLength(1)
      expect(result?.body[0]).toHaveProperty('propertyPath', 'innerField')
      expect(result?.body[0]).toHaveProperty('message', 'inner error 1')
    })
  })
})
