import { expressYupMiddleware } from './express-yup-middleware'
import * as indexExports from './index'
import { validatePayload } from './schema-validator'

describe('index exports', () => {
  it('should export expressYupMiddleware', () => {
    expect(indexExports.expressYupMiddleware).toBe(expressYupMiddleware)
  })

  it('should export validatePayload', () => {
    expect(indexExports.validatePayload).toBe(validatePayload)
  })

  it('should have correct export types', () => {
    // Type-only imports disappear at runtime, so we can only test the
    // existence of runtime functions and not type exports
    // This test is mainly to ensure our index.ts file is exporting what it should
    const expectedExports = ['expressYupMiddleware', 'validatePayload']

    const actualExports = Object.keys(indexExports)
    expect(actualExports.sort()).toEqual(expectedExports.sort())
  })
})
