import express from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { SchemaValidationInterface } from '../src/schema-validation-interface'
import { yupMiddleware } from '../src/yup-middleware'

const createAppWithPath = ({ path, middleware }) => {
  const app = express()

  app.use(path, middleware)

  return app
}

describe('express yup middleware', () => {
  it('creates an express middleware', () => {
    const expressMiddleware = yupMiddleware({ schemaValidator: {} })

    expect(typeof expressMiddleware).toBe('function')
  })

  describe('when validating', () => {
    let agent = null

    describe('only the request query params', () => {
      const querySchemaValidator: SchemaValidationInterface = {
        query: {
          schema: Yup.object().shape({
            testQueryParam: Yup.number().required('requiredTestQueryParam'),
          }),
        },
      }

      beforeEach(() => {
        const app = createAppWithPath({
          path: '/test',
          middleware: yupMiddleware({ schemaValidator: querySchemaValidator }),
        })

        agent = request(app)
      })

      it('returns a bad request error when not passing a required property', async () => {
        const response = await agent.get('/test').expect(400)

        expect(response.body).toStrictEqual({
          errors: {
            query: [
              {
                message: 'requiredTestQueryParam',
                propertyPath: 'testQueryParam',
              },
            ],
          },
        })
      })
    })
  })
})
