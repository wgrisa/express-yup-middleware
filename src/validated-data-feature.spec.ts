import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { expressYupMiddleware } from './express-yup-middleware'
import { ExpressYupMiddlewareInterface } from './schema-validation-interface'

const createAppWithPath = ({ path, middleware, method = 'get', handler = null }) => {
  const app = express()

  app.use(bodyParser.json())

  app[method](path, middleware, handler || ((_req: Request, res: Response) => res.sendStatus(200)))

  return app
}

describe('express-yup-middleware validated data feature', () => {
  describe('when using the storeValidatedData option', () => {
    it('should store validated data in req.validated by default', async () => {
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

      let validatedDataFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          storeValidatedData: true,
        }),
        handler: (req: Request, res: Response) => {
          validatedDataFromRequest = req['validated']
          return res.json({ validatedData: validatedDataFromRequest })
        },
      })

      // Act
      const testData = { name: 'John Doe', email: 'john@example.com' }
      const response = await request(app).post('/test').send(testData)

      // Assert
      expect(response.status).toBe(200)
      expect(validatedDataFromRequest).toBeDefined()
      expect(validatedDataFromRequest.body).toEqual(testData)
    })

    it('should use a custom key when validatedDataKey is provided', async () => {
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

      let validatedDataFromRequest = null
      const customKey = 'typedData'

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          storeValidatedData: true,
          validatedDataKey: customKey,
        }),
        handler: (req: Request, res: Response) => {
          validatedDataFromRequest = req[customKey]
          return res.json({ validatedData: validatedDataFromRequest })
        },
      })

      // Act
      const testData = { name: 'John Doe', email: 'john@example.com' }
      const response = await request(app).post('/test').send(testData)

      // Assert
      expect(response.status).toBe(200)
      expect(validatedDataFromRequest).toBeDefined()
      expect(validatedDataFromRequest.body).toEqual(testData)
    })

    it('should validate multiple properties and store them separately', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
            }),
          },
          query: {
            yupSchema: Yup.object().shape({
              filter: Yup.string().required(),
            }),
          },
          params: {
            yupSchema: Yup.object().shape({
              id: Yup.string().required(),
            }),
          },
        },
      }

      let validatedDataFromRequest = null

      const app = createAppWithPath({
        path: '/test/:id',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          storeValidatedData: true,
        }),
        handler: (req: Request, res: Response) => {
          validatedDataFromRequest = req['validated']
          return res.json({ validatedData: validatedDataFromRequest })
        },
      })

      // Act
      const bodyData = { name: 'John Doe' }
      const response = await request(app).post('/test/123').query({ filter: 'active' }).send(bodyData)

      // Assert
      expect(response.status).toBe(200)
      expect(validatedDataFromRequest).toBeDefined()
      expect(validatedDataFromRequest.body).toEqual(bodyData)
      expect(validatedDataFromRequest.query).toEqual({ filter: 'active' })
      expect(validatedDataFromRequest.params).toEqual({ id: '123' })
    })

    it('should not store validated data when storeValidatedData is false', async () => {
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

      let validatedDataFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          storeValidatedData: false, // Explicitly set to false
        }),
        handler: (req: Request, res: Response) => {
          validatedDataFromRequest = req['validated']
          return res.json({ validatedData: validatedDataFromRequest })
        },
      })

      // Act
      const testData = { name: 'John Doe', email: 'john@example.com' }
      const response = await request(app).post('/test').send(testData)

      // Assert
      expect(response.status).toBe(200)
      expect(validatedDataFromRequest).toBeUndefined()
    })

    it('should handle validation errors correctly while still storing valid data', async () => {
      // Arrange
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
              email: Yup.string().email().required(),
            }),
            validateOptions: {
              abortEarly: false, // Don't abort after first error
            },
          },
          query: {
            yupSchema: Yup.object().shape({
              filter: Yup.string().required(),
            }),
          },
        },
      }

      let validatedDataFromRequest = null

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          storeValidatedData: true,
          continueOnError: true, // Continue despite errors
        }),
        handler: (req: Request, res: Response) => {
          validatedDataFromRequest = req['validated']
          return res.json({
            validatedData: validatedDataFromRequest,
            errors: req['validationErrors'],
          })
        },
      })

      // Act - Send invalid body but valid query
      const invalidBodyData = { name: 'John Doe' } // Missing email
      const response = await request(app).post('/test').query({ filter: 'active' }).send(invalidBodyData)

      // Assert
      expect(response.status).toBe(200)
      expect(validatedDataFromRequest).toBeDefined()
      expect(validatedDataFromRequest.query).toEqual({ filter: 'active' }) // Query should be validated
      expect(validatedDataFromRequest.body).toBeUndefined() // Body should not be present due to validation error
    })
  })
})
