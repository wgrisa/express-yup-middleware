import express from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { expressYupMiddleware } from '../src/express-yup-middleware'
import { SchemaValidationInterface } from '../src/schema-validation-interface'

const createAppWithPath = ({ path, middleware }) => {
  const app = express()

  app.use(path, middleware)

  return app
}

describe('express yup middleware', () => {
  it('creates an express middleware', () => {
    const expressMiddleware = expressYupMiddleware({ schemaValidator: {} })

    expect(typeof expressMiddleware).toBe('function')
  })

  describe('when validating the request query, body and params properties', () => {
    let agent = null

    describe('without custom error messages', () => {
      const schemaValidator: SchemaValidationInterface = {
        query: {
          schema: Yup.object().shape({
            testQueryParam: Yup.string().required('requiredTestQueryParam'),
          }),
        },
        body: {
          schema: Yup.object().shape({
            testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
          }),
        },
        params: {
          schema: Yup.object().shape({
            testParams: Yup.string().required('requiredTestParams'),
          }),
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
      const schemaValidator: SchemaValidationInterface = {
        body: {
          schema: Yup.object().shape({
            testBodyProperty: Yup.string().required('requiredTestBodyProperty'),
          }),
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
})
