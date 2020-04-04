import express from 'express'
import request from 'supertest'
import * as Yup from 'yup'

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

    describe('the request query', () => {
      const yupSchema = {
        schema: Yup.object().shape({
          testQueryParam: Yup.number().required('requiredTestQueryParam'),
        }),
      }

      const customErrorMessages = {
        requiredTestQueryParam: {
          key: 'requiredTestQueryParam',
          message: 'The query param "testQueryParam" is required!',
        },
      }

      const schemaValidator = {
        query: yupSchema,
        errorMessages: customErrorMessages,
      }

      beforeEach(() => {
        const app = createAppWithPath({
          path: '/test',
          middleware: yupMiddleware({ schemaValidator }),
        })

        agent = request(app)
      })

      it('returns a bad request error when not passing a required property', async () => {
        const response = await agent.get('/test').expect(400)

        expect(response.body).toStrictEqual({
          errors: {
            query: [
              {
                ...customErrorMessages.requiredTestQueryParam,
                propertyPath: 'testQueryParam',
              },
            ],
          },
        })
      })
    })
  })
})
