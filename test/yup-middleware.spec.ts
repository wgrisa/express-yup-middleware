import express from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { expressYupMiddleware } from '../src/express-yup-middleware'
import { ExpressYupMiddlewareInterface } from '../src/schema-validation-interface'

const createAppWithPath = ({ path, middleware }) => {
  const app = express()

  app.use(path, middleware)

  return app
}

describe('express yup middleware', () => {
  let agent = null

  it('creates an express middleware', () => {
    const expressMiddleware = expressYupMiddleware({ schemaValidator: {} })

    expect(typeof expressMiddleware).toBe('function')
  })

  describe('when validating the request query, body and params properties', () => {
    describe('without custom error messages', () => {
      const schemaValidator: ExpressYupMiddlewareInterface = {
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

      beforeEach(() => {
        const app = createAppWithPath({
          path: '/test',
          middleware: expressYupMiddleware({ schemaValidator }),
        })

        agent = request(app)
      })

      it('returns a bad request error showing yup validation messages', async () => {
        const { body } = await agent.get('/test').expect(400)

        expect(body).toStrictEqual({
          errors: {
            query: [
              {
                message: 'requiredTestQueryParam',
                propertyPath: 'testQueryParam',
              },
            ],
            body: [
              {
                message: 'requiredTestBodyProperty',
                propertyPath: 'testBodyProperty',
              },
            ],
            params: [
              {
                message: 'requiredTestParams',
                propertyPath: 'testParams',
              },
            ],
          },
        })
      })
    })

    describe('using custom error messages', () => {
      const schemaValidator: ExpressYupMiddlewareInterface = {
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

      beforeEach(() => {
        const app = createAppWithPath({
          path: '/test',
          middleware: expressYupMiddleware({ schemaValidator }),
        })

        agent = request(app)
      })

      it('returns a bad request error showing yup validation messages', async () => {
        const { body } = await agent.get('/test').expect(400)

        expect(body).toStrictEqual({
          errors: {
            body: [
              {
                ...schemaValidator.errorMessages.requiredTestBodyProperty,
                propertyPath: 'testBodyProperty',
              },
            ],
          },
        })
      })
    })
  })

  describe('when validating a custom request property', () => {
    const schemaValidator: ExpressYupMiddlewareInterface = {
      schema: {
        headers: {
          yupSchema: Yup.object().shape({
            testHeaderProperty: Yup.string().required('requiredHeaderProperty'),
          }),
        },
      },
      errorMessages: {
        requiredHeaderProperty: {
          key: 'required-header-property',
          message: 'The "testHeaderProperty" property is required!',
        },
      },
    }

    beforeEach(() => {
      const app = createAppWithPath({
        path: '/test',
        middleware: expressYupMiddleware({ schemaValidator, propertiesToValidate: ['headers'] }),
      })

      agent = request(app)
    })

    it('returns a bad request error showing yup validation messages', async () => {
      const { body } = await agent.get('/test').expect(400)

      expect(body).toStrictEqual({
        errors: {
          headers: [
            {
              ...schemaValidator.errorMessages.requiredHeaderProperty,
              propertyPath: 'testHeaderProperty',
            },
          ],
        },
      })
    })
  })
})
