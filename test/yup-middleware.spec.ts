import express from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { yupMiddleware } from '../src/yup-middleware'

const createAppWithPath = ({ path, middleware }) => {
  const app = express()

  app.use(path, middleware)

  return app
}

describe('yup middleware', () => {
  it('creates an express middleware', () => {
    const expressMiddleware = yupMiddleware({ schemaValidator: {} })

    expect(typeof expressMiddleware).toBe('function')
  })

  describe('when validating', () => {
    let agent = null

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

    it('validates a request query', async () => {
      const response = await agent.get('/test').expect(400)

      expect(response.body).toStrictEqual({
        errors: [
          {
            ...customErrorMessages.requiredTestQueryParam,
            propertyPath: 'testQueryParam',
          },
        ],
      })
    })
  })
})
