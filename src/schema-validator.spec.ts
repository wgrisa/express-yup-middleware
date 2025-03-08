import * as Yup from 'yup'
import { ValidationError as YupValidationError } from 'yup'
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
              name: Yup.string(),
            }),
          },
        },
      }
      const payload = {
        body: {
          name: 'test',
        },
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
      })

      // Assert
      expect(result.errors).toBeNull()
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body[0]).toHaveProperty('propertyPath', 'name')
      expect(result.errors?.body[0]).toHaveProperty('message', 'nameRequired')
    })

    it('should skip validation if schema for property is not defined', async () => {
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
        notDefinedProperty: {},
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['notDefinedProperty'],
      })

      // Assert
      expect(result.errors).toBeNull()
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors).toHaveProperty('query')
      expect(result.errors?.body[0]).toHaveProperty('message', 'nameRequired')
      expect(result.errors?.query[0]).toHaveProperty('message', 'searchRequired')
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body[0]).toHaveProperty('key', 'name-is-required')
      expect(result.errors?.body[0]).toHaveProperty('message', 'Name is a required field')
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
              documentationUrl: 'https://example.com/docs/required-fields',
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body[0]).toHaveProperty('additionalData')
      expect(result.errors?.body[0].additionalData).toEqual({
        fieldType: 'string',
        importance: 'high',
        documentationUrl: 'https://example.com/docs/required-fields',
      })
    })

    it('should handle validation errors with undefined path', async () => {
      // Arrange
      const mockValidate = jest.fn().mockRejectedValue(new YupValidationError('validation error'))
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: {
              validate: mockValidate,
            } as any,
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body[0]).toHaveProperty('propertyPath', 'unknown')
      expect(result.errors?.body[0]).toHaveProperty('message', 'validation error')
    })

    it('should handle validation errors with null message', async () => {
      // Arrange
      const error = new YupValidationError('Original message')
      error.path = 'fieldName'
      error.message = null as any
      const mockValidate = jest.fn().mockRejectedValue(error)
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: {
              validate: mockValidate,
            } as any,
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body[0]).toHaveProperty('propertyPath', 'fieldName')
      expect(result.errors?.body[0]).toHaveProperty('message', 'Validation error')
    })

    it('should handle inner validation errors', async () => {
      // Arrange
      const error = new YupValidationError('Parent error')
      error.inner = [
        Object.assign(new YupValidationError('inner error 1'), { path: 'innerField1' }),
        Object.assign(new YupValidationError('inner error 2'), { path: 'innerField2' }),
      ]
      const mockValidate = jest.fn().mockRejectedValue(error)
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: {
              validate: mockValidate,
            } as any,
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body).toHaveLength(2)
      expect(result.errors?.body[0]).toHaveProperty('propertyPath', 'innerField1')
      expect(result.errors?.body[0]).toHaveProperty('message', 'inner error 1')
      expect(result.errors?.body[1]).toHaveProperty('propertyPath', 'innerField2')
      expect(result.errors?.body[1]).toHaveProperty('message', 'inner error 2')
    })

    it('should avoid duplicate errors for the same property path', async () => {
      // Arrange
      const error = new YupValidationError('Parent error')
      error.inner = [
        Object.assign(new YupValidationError('inner error 1'), { path: 'innerField' }),
        Object.assign(new YupValidationError('inner error 2'), { path: 'innerField' }), // Duplicate path
      ]
      const mockValidate = jest.fn().mockRejectedValue(error)
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: {
              validate: mockValidate,
            } as any,
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
      expect(result.errors).not.toBeNull()
      expect(result.errors).toHaveProperty('body')
      expect(result.errors?.body).toHaveLength(1)
      expect(result.errors?.body[0]).toHaveProperty('propertyPath', 'innerField')
      expect(result.errors?.body[0]).toHaveProperty('message', 'inner error 1')
    })

    it('should return validated data when returnValidatedData is true', async () => {
      // Arrange
      const validData = { name: 'test' }
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
        body: validData,
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
        returnValidatedData: true,
      })

      // Assert
      expect(result.errors).toBeNull()
      expect(result.validatedData).toBeDefined()
      expect(result.validatedData?.body).toEqual(validData)
    })

    it('should not return validated data when returnValidatedData is false', async () => {
      // Arrange
      const validData = { name: 'test' }
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
        body: validData,
      }

      // Act
      const result = await validatePayload({
        schemaValidator,
        payload,
        propertiesToValidate: ['body'],
        returnValidatedData: false,
      })

      // Assert
      expect(result.errors).toBeNull()
      expect(result.validatedData).toBeUndefined()
    })
  })
})
