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

/**
 * These tests cover edge cases that might not be addressed by the main test suite
 */
describe('Edge cases', () => {
  describe('Empty schema objects', () => {
    it('should handle empty schema object', async () => {
      const schemaValidator = {
        schema: {},
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      const response = await request(app).post('/test').send({})

      expect(response.status).toBe(200)
    })

    it('should handle schema with undefined properties', async () => {
      const schemaValidator = {
        schema: {
          body: undefined,
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      const response = await request(app).post('/test').send({})

      expect(response.status).toBe(200)
    })
  })

  describe('Non-standard HTTP methods', () => {
    it('should work with non-standard HTTP methods like PATCH', async () => {
      const schemaValidator = {
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
        method: 'patch',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      // Test failure
      const failResponse = await request(app).patch('/test').send({})

      expect(failResponse.status).toBe(400)
      expect(failResponse.body.errors.body[0].message).toBe('nameRequired')

      // Test success
      const successResponse = await request(app).patch('/test').send({ name: 'Test' })

      expect(successResponse.status).toBe(200)
    })
  })

  describe('Deep nested objects', () => {
    it('should validate deeply nested objects', async () => {
      const schemaValidator = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              user: Yup.object()
                .shape({
                  profile: Yup.object().shape({
                    details: Yup.object().shape({
                      name: Yup.string().required('nameRequired'),
                    }),
                  }),
                })
                .required(),
            }),
          },
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      // Test with missing nested property
      const failResponse = await request(app)
        .post('/test')
        .send({
          user: {
            profile: {
              details: {},
            },
          },
        })

      expect(failResponse.status).toBe(400)
      expect(failResponse.body.errors.body[0].propertyPath).toBe('user.profile.details.name')

      // Test with all required properties
      const successResponse = await request(app)
        .post('/test')
        .send({
          user: {
            profile: {
              details: {
                name: 'Test User',
              },
            },
          },
        })

      expect(successResponse.status).toBe(200)
    })
  })

  describe('Large data sets', () => {
    it('should handle large arrays of data', async () => {
      const schemaValidator = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              items: Yup.array()
                .of(
                  Yup.object().shape({
                    id: Yup.number().required('idRequired'),
                    name: Yup.string().required('nameRequired'),
                  }),
                )
                .required()
                .min(1, 'needsAtLeastOneItem'),
            }),
          },
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      // Generate large array of 100 items
      const largeArray = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
      }))

      // Test with large valid data
      const successResponse = await request(app).post('/test').send({ items: largeArray })

      expect(successResponse.status).toBe(200)

      // Generate array with one invalid item
      const arrayWithError = [...largeArray]
      delete arrayWithError[50].name

      // Test with large data containing an error
      const failResponse = await request(app).post('/test').send({ items: arrayWithError })

      expect(failResponse.status).toBe(400)
      expect(failResponse.body.errors.body[0].propertyPath).toContain('items[50].name')
    })
  })

  describe('Multiple middleware chains', () => {
    it('should work correctly in a chain of multiple middleware', async () => {
      const schemaValidator1 = {
        schema: {
          query: {
            yupSchema: Yup.object().shape({
              id: Yup.number().required('idRequired'),
            }),
          },
        },
      }

      const schemaValidator2 = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
        },
      }

      let middlewareCalls = 0

      const app = express()
      app.use(bodyParser.json())

      app.post(
        '/test',
        (req, res, next) => {
          middlewareCalls++
          next()
        },
        expressYupMiddleware({ schemaValidator: schemaValidator1 }),
        (req, res, next) => {
          middlewareCalls++
          next()
        },
        expressYupMiddleware({ schemaValidator: schemaValidator2 }),
        (req, res) => {
          middlewareCalls++
          res.sendStatus(200)
        },
      )

      // Test with all valid data
      const response = await request(app).post('/test').query({ id: 123 }).send({ name: 'Test' })

      expect(response.status).toBe(200)
      expect(middlewareCalls).toBe(3) // All middleware executed
    })
  })

  describe('Special characters and encoding', () => {
    it('should handle special characters and encoding correctly', async () => {
      const schemaValidator = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
              email: Yup.string().email().required(),
            }),
          },
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      // Test with special characters
      const response = await request(app).post('/test').send({
        name: '名前¿Éà?ñòλ',
        email: 'test+special-chars@example.com',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('Custom error with empty values', () => {
    it('should handle errorMessages with empty or null values', async () => {
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required('nameRequired'),
            }),
          },
        },
        errorMessages: {
          nameRequired: null as any,
        },
      }

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      const response = await request(app).post('/test').send({})

      expect(response.status).toBe(400)
      // Should use default error handling
      expect(response.body.errors.body[0].message).toBe('nameRequired')
    })
  })

  describe('Error handling with continueOnError', () => {
    it('should not modify the request on validation success when using continueOnError', async () => {
      const schemaValidator = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              name: Yup.string().required(),
            }),
          },
        },
      }

      let validationErrorsFromRequest = undefined

      const app = createAppWithPath({
        path: '/test',
        method: 'post',
        middleware: expressYupMiddleware({
          schemaValidator,
          continueOnError: true,
          customContextKey: 'validationErrors',
        }),
        handler: (req: any, res: Response) => {
          validationErrorsFromRequest = req.validationErrors
          return res.sendStatus(200)
        },
      })

      // Test with valid data
      const response = await request(app).post('/test').send({ name: 'Test User' })

      expect(response.status).toBe(200)
      expect(validationErrorsFromRequest).toBeUndefined()
    })
  })
})
