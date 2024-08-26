import * as core from '@actions/core'
import { run } from '../../src/main'
import { access, constants, cp } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import * as esbuild from 'esbuild'
import { promisify } from 'util'

let getInputMock: jest.SpiedFunction<typeof core.getInput>

describe('e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
  })

  it('can build and execute a single executable application', async () => {
    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'bundle':
          return '../__tests__/e2e/.build/bundle.cjs'
        default:
          return ''
      }
    })

    // Build the single-file bundle
    let bundle = await esbuild.build({
      entryPoints: [join(__dirname, 'main.ts')],
      bundle: true,
      platform: 'node',
      outfile: join(__dirname, '.build/bundle.cjs')
    })

    await run()
    expect(getInputMock).toHaveBeenCalledTimes(1)
    expect(getInputMock).toHaveBeenCalledWith('bundle')

    expect(async () =>
      access(join(__dirname, '.build/bin'), constants.X_OK | constants.R_OK)
    ).not.toThrow()

    const result = await promisify(execFile)(join(__dirname, '.build/bin'), {
      encoding: 'utf-8'
    })
    expect(typeof result.stdout).toBe('string')
    expect(result.stdout).toContain('hello')
  }, 10_000)
})
