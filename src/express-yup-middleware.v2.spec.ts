import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { expressYupMiddleware } from './express-yup-middleware'
import { ExpressYupMiddlewareInterface, ValidationResult } from './schema-validation-interface'

const createAppWithPath = ({ path, middleware, method = 'get', handler = null }) => {
  const app = express()

  app.use(bodyParser.json())

  app[method](path, middleware, handler || ((_req: Request, res: Response) => res.sendStatus(200)))

  return app
}

describe('express-yup-middleware v2.0.0 features', () => {
  describe('when using the continueOnError option', () => {
    it('should continue to the next middleware and store validation errors in req.validationErrors', async () => {
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

      let validationErrorsFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          continueOnError: true,
        }),
        handler: (req: Request, res: Response) => {
          validationErrorsFromRequest = req['validationErrors']
          return res.json({ message: 'Continued despite errors' })
        },
      })

      // Act
      const response = await request(app).post('/test').send({})

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ message: 'Continued despite errors' })
      expect(validationErrorsFromRequest).not.toBeNull()
      expect(validationErrorsFromRequest).toHaveProperty('body')
      expect(validationErrorsFromRequest.body[0]).toHaveProperty('propertyPath', 'name')
      expect(validationErrorsFromRequest.body[0]).toHaveProperty('message', 'nameRequired')
    })

    it('should use customContextKey when provided', async () => {
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

      let validationErrorsFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          continueOnError: true,
          customContextKey: 'myCustomErrors',
        }),
        handler: (req: Request, res: Response) => {
          validationErrorsFromRequest = req['myCustomErrors']
          return res.json({ message: 'Continued despite errors' })
        },
      })

      // Act
      const response = await request(app).post('/test').send({})

      // Assert
      expect(response.status).toBe(200)
      expect(validationErrorsFromRequest).not.toBeNull()
      expect(validationErrorsFromRequest).toHaveProperty('body')
    })
  })

  describe('when using the errorFormatter option', () => {
    it('should format errors using the provided function', async () => {
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

      const errorFormatter = (errors: ValidationResult) => ({
        status: 'validation_failed',
        timestamp: '2023-01-01T00:00:00Z', // Fixed timestamp for testing
        validationIssues: errors,
        code: 400,
      })

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          errorFormatter,
        }),
      })

      // Act
      const response = await request(app).post('/test').send({})

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        status: 'validation_failed',
        timestamp: '2023-01-01T00:00:00Z',
        validationIssues: {
          body: [
            {
              message: 'nameRequired',
              propertyPath: 'name',
            },
          ],
        },
        code: 400,
      })
    })
  })

  describe('when using default properties', () => {
    it('should use the provided expectedStatusCode as default', async () => {
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

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          expectedStatusCode: 422,
        }),
      })

      // Act
      const response = await request(app).post('/test').send({})

      // Assert
      expect(response.status).toBe(422)
      expect(response.body).toHaveProperty('errors')
    })
  })

  describe('when using additionalData in error messages', () => {
    it('should include additionalData in the response', async () => {
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
              documentationUrl: 'https://example.com/docs/name',
            },
          },
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      // Act
      const response = await request(app).post('/test').send({})

      // Assert
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('errors')
      expect(response.body.errors.body[0]).toHaveProperty('additionalData')
      expect(response.body.errors.body[0].additionalData).toEqual({
        fieldType: 'string',
        importance: 'high',
        documentationUrl: 'https://example.com/docs/name',
      })
    })
  })

  describe('integration with all features', () => {
    it('should correctly integrate continueOnError, customContextKey, and errorFormatter', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
              email: Yup.string().email('invalidEmail').required('emailRequired'),
            }),
            validateOptions: {
              abortEarly: false,
            },
          },
        },
        errorMessages: {
          nameRequired: {
            key: 'name-required',
            message: 'Name is required',
            additionalData: { fieldType: 'string' },
          },
          emailRequired: {
            key: 'email-required',
            message: 'Email is required',
            additionalData: { fieldType: 'email' },
          },
          invalidEmail: {
            key: 'email-invalid',
            message: 'Email is invalid',
            additionalData: { fieldType: 'email' },
          },
        },
      }

      const errorFormatter = (errors: ValidationResult) => ({
        status: 'error',
        validationFailures: errors,
        timestamp: '2023-01-01T00:00:00Z',
      })

      let validationErrorsFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          errorFormatter,
          continueOnError: true,
          customContextKey: 'validationResult',
          expectedStatusCode: 422,
        }),
        handler: (req: Request, res: Response) => {
          validationErrorsFromRequest = req['validationResult']

          // Ensure we still get the formatted response when we choose to reject
          if (validationErrorsFromRequest) {
            return res.status(422).json(errorFormatter(validationErrorsFromRequest))
          }

          return res.json({ success: true })
        },
      })

      // Act
      const response = await request(app).post('/test').send({ email: 'not-an-email' })

      // Assert
      expect(response.status).toBe(422)
      expect(response.body).toEqual({
        status: 'error',
        validationFailures: {
          body: [
            {
              key: 'name-required',
              message: 'Name is required',
              additionalData: { fieldType: 'string' },
              propertyPath: 'name',
            },
            {
              key: 'email-invalid',
              message: 'Email is invalid',
              additionalData: { fieldType: 'email' },
              propertyPath: 'email',
            },
          ],
        },
        timestamp: '2023-01-01T00:00:00Z',
      })
      expect(validationErrorsFromRequest).not.toBeNull()
    })

    it('should pass validation when all requirements are met', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
              email: Yup.string().email().required(),
            }),
          },
        },
      }

      let requestReachedHandler = false

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          continueOnError: false,
          expectedStatusCode: 422,
        }),
        handler: (_req: Request, res: Response) => {
          requestReachedHandler = true
          return res.json({ success: true })
        },
      })

      // Act
      const response = await request(app).post('/test').send({
        name: 'John Doe',
        email: 'john@example.com',
      })

      // Assert
      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
      expect(requestReachedHandler).toBe(true)
    })
  })
})
