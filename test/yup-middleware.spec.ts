import bodyParser from 'body-parser'
import express, { Request, Response } from 'express'
import request from 'supertest'
import * as Yup from 'yup'

import { expressYupMiddleware } from '../src/express-yup-middleware'
import { ExpressYupMiddlewareInterface } from '../src/schema-validation-interface'

const createAppWithPath = ({ path, middleware, method = 'get' }) => {
  const app = express()

  app.use(bodyParser.json())

  app[method](path, middleware, (_req: Request, res: Response) => res.sendStatus(200))

  return app
}

describe('express yup middleware', () => {
  let agent = null

  it('creates an express middleware', () => {
    const expressMiddleware = expressYupMiddleware({ schemaValidator: { schema: {} } })

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

  describe('using yup validation option', () => {
    describe('abort early', () => {
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

      beforeEach(() => {
        const app = createAppWithPath({
          path: '/test',
          middleware: expressYupMiddleware({ schemaValidator }),
        })

        agent = request(app)
      })

      it('returns an array with all the errors when validating multiple error messages on the body', async () => {
        const { body } = await agent.get('/test').expect(400)

        expect(body).toStrictEqual({
          errors: {
            body: [
              {
                message: 'requiredFirstTestBodyProperty',
                propertyPath: 'firstTestBodyProperty',
              },
              {
                message: 'requiredSecondTestBodyProperty',
                propertyPath: 'secondTestBodyProperty',
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
              message: 'requiredHeaderProperty',
              propertyPath: 'testHeaderProperty',
            },
          ],
        },
      })
    })
  })

  describe('when returning a custom validation code', () => {
    const schemaValidator: ExpressYupMiddlewareInterface = {
      schema: {
        body: {
          yupSchema: Yup.object().shape({
            testProperty: Yup.string().required('required'),
          }),
        },
      },
    }

    beforeEach(() => {
      const app = createAppWithPath({
        path: '/test',
        middleware: expressYupMiddleware({ schemaValidator, expectedStatusCode: 418 }),
      })

      agent = request(app)
    })

    it(`returns "I'm a teapot" code 418`, async () => {
      const { body } = await agent.get('/test').expect(418)

      expect(body).toStrictEqual({
        errors: {
          body: [
            {
              message: 'required',
              propertyPath: 'testProperty',
            },
          ],
        },
      })
    })
  })

  describe('when using the request as an Yup context to cross validate', () => {
    const shouldBeOfTypeAccordingTo = (source) =>
      function shouldBeEven(this: Yup.TestContext, numberToValidate: any) {
        const mod = numberToValidate % 2
        const type = this.options.context['payload'][source].type

        if (!type) {
          return false
        }

        if (type === 'even') return mod === 0
        if (type === 'odd') return mod !== 0

        return false
      }

    it('returns a bad request error using a query value within a param validation', async () => {
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          params: {
            yupSchema: Yup.object().shape({
              numberToValidate: Yup.string().test({
                message: 'Check if your number correspond with the type given',
                test: shouldBeOfTypeAccordingTo('query'),
              }),
            }),
          },
        },
      }

      const app = createAppWithPath({
        path: '/test/:numberToValidate',
        middleware: expressYupMiddleware({ schemaValidator }),
      })

      agent = request(app)

      const { body } = await agent.get('/test/1?type=even').expect(400)
      await agent.get('/test/1?type=odd').expect(200)
      await agent.get('/test/2?type=even').expect(200)

      expect(body).toStrictEqual({
        errors: {
          params: [
            {
              propertyPath: 'numberToValidate',
              message: 'Check if your number correspond with the type given',
            },
          ],
        },
      })
    })

    it('returns a bad request error when the number sent in the payload does not match the type param', async () => {
      const schemaValidator: ExpressYupMiddlewareInterface = {
        schema: {
          body: {
            yupSchema: Yup.object().shape({
              numberToValidate: Yup.string().test({
                message: 'Check if your number corresponds with the given type',
                test(this: Yup.TestContext, numberToValidate: any) {
                  const mod = numberToValidate % 2
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

      agent = request(app)

      const { body } = await agent
        .post('/test/even')
        .send({
          numberToValidate: 1,
        })
        .expect(400)

      await agent
        .post('/test/odd')
        .send({
          numberToValidate: 1,
        })
        .expect(200)

      await agent
        .post('/test/even')
        .send({
          numberToValidate: 2,
        })
        .expect(200)

      expect(body).toStrictEqual({
        errors: {
          body: [
            {
              propertyPath: 'numberToValidate',
              message: 'Check if your number corresponds with the given type',
            },
          ],
        },
      })
    })
  })
})
