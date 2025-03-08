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
 * These tests specifically ensure backward compatibility with code written
 * for version 1.x of the middleware. They use the old syntax and patterns
 * to verify that upgrading doesn't break existing implementations.
 */
describe('Backward compatibility with v1.x', () => {
  it('should work with the original basic schema validation syntax', async () => {
    // This is the exact example from the v1.x README
    const schemaValidator = {
      schema: {
        query: {
          yupSchema: Yup.object().shape({
            testQueryParam: Yup.string().required('requiredTestQueryParam'),
          }),
        },
        body: {
          yupSchema: Yup.object().shape({
            testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
          }),
        },
        params: {
          yupSchema: Yup.object().shape({
            testParams: Yup.string().required('requiredTestParams'),
          }),
        },
      },
    }

    const app = createAppWithPath({
      path: '/test/:testParams',
      method: 'post',
      middleware: expressYupMiddleware({ schemaValidator }),
    })

    const response = await request(app)
      .post('/test/valid')
      .query({ testQueryParam: 'valid' })
      .send({ testBodyProperty: 'valid' })

    expect(response.status).toBe(200)
  })

  it('should work with the original custom error messages syntax', async () => {
    // This is the exact example from the v1.x README
    const schemaValidator = {
      schema: {
        body: {
          yupSchema: Yup.object().shape({
            testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
          }),
        },
      },
      errorMessages: {
        requiredTestBodyProperty: {
          key: 'tes-body-property-required',
          message: 'The "testBodyProperty" property is required!',
        },
      },
    }

    const app = createAppWithPath({
      path: '/test',
      method: 'post',
      middleware: expressYupMiddleware({ schemaValidator }),
    })

    const response = await request(app).post('/test').send({})

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      errors: {
        body: [
          {
            key: 'tes-body-property-required',
            message: 'The "testBodyProperty" property is required!',
            propertyPath: 'testBodyProperty',
          },
        ],
      },
    })
  })

  it('should work with the original Yup validation options syntax', async () => {
    // This is based on the example from the v1.x README
    const schemaValidator: ExpressYupMiddlewareInterface = {
      schema: {
        body: {
          yupSchema: Yup.object().shape({
            firstTestBodyProperty: Yup.string().required('requiredFirstTestBodyProperty'),
            secondTestBodyProperty: Yup.string().required('requiredSecondTestBodyProperty'),
          }),
          validateOptions: {
            abortEarly: false,
          },
        },
      },
    }

    const app = createAppWithPath({
      path: '/test',
      method: 'post',
      middleware: expressYupMiddleware({ schemaValidator }),
    })

    const response = await request(app).post('/test').send({})

    expect(response.status).toBe(400)
    expect(response.body.errors.body).toHaveLength(2)
    expect(response.body.errors.body[0]).toHaveProperty('propertyPath')
    expect(response.body.errors.body[1]).toHaveProperty('propertyPath')
  })

  it('should work with the original cross-validation syntax', async () => {
    // This is based on the example from the v1.x README
    const schemaValidator = {
      schema: {
        body: {
          yupSchema: Yup.object().shape({
            numberToValidate: Yup.number()
              .required()
              .test({
                message: 'Check if your number corresponds with the given type',
                test(numberToValidate: any) {
                  const mod = numberToValidate % 2
                  // Access the context which contains the payload
                  const type = this.options.context['payload'].params.type

                  if (!type) {
                    return false
                  }

                  if (type === 'even') {
                    return mod === 0
                  }

                  if (type === 'odd') {
                    return mod !== 0
                  }

                  return false
                },
              }),
          }),
        },
      },
    }

    const app = createAppWithPath({
      path: '/test/:type',
      method: 'post',
      middleware: expressYupMiddleware({ schemaValidator }),
    })

    // Test with odd number in 'even' type route
    const failResponse = await request(app).post('/test/even').send({ numberToValidate: 3 })

    expect(failResponse.status).toBe(400)
    expect(failResponse.body.errors.body[0].message).toBe('Check if your number corresponds with the given type')

    // Test with even number in 'even' type route
    const successResponse = await request(app).post('/test/even').send({ numberToValidate: 2 })

    expect(successResponse.status).toBe(200)
  })

  it('should work with the original custom property validation syntax', async () => {
    // This is based on the example from the v1.x README
    const schemaValidator = {
      schema: {
        headers: {
          yupSchema: Yup.object().shape({
            'test-header': Yup.string().required('requiredHeaderProperty'),
          }),
        },
      },
    }

    const app = createAppWithPath({
      path: '/test',
      method: 'post',
      middleware: expressYupMiddleware({
        schemaValidator,
        propertiesToValidate: ['headers'],
      }),
    })

    // Test without required header
    const failResponse = await request(app).post('/test').send({})

    expect(failResponse.status).toBe(400)
    expect(failResponse.body.errors.headers[0].message).toBe('requiredHeaderProperty')

    // Test with required header
    const successResponse = await request(app).post('/test').set('test-header', 'value').send({})

    expect(successResponse.status).toBe(200)
  })

  it('should work with the original custom status code syntax', async () => {
    // This is based on the example from the v1.x README
    const schemaValidator = {
      schema: {
        body: {
          yupSchema: Yup.object().shape({
            testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
          }),
        },
      },
    }

    const app = createAppWithPath({
      path: '/test',
      method: 'post',
      middleware: expressYupMiddleware({
        schemaValidator,
        expectedStatusCode: 418,
      }),
    })

    const response = await request(app).post('/test').send({})

    expect(response.status).toBe(418)
  })
})
