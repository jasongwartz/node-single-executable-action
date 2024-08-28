import * as core from '@actions/core'
import { run } from '../../src/main'
import { access, constants } from 'fs/promises'
import { join } from 'path'
import { execFile } from 'child_process'
import * as esbuild from 'esbuild'
import { promisify } from 'util'

let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setOutputMock: jest.SpiedFunction<typeof core.setOutput>

describe('e2e', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  it('can build and execute a single executable application', async () => {
    const outputBinaryName = 'test-binary-123'

    getInputMock.mockImplementation(name => {
      switch (name) {
        case 'bundle':
          return '../__tests__/e2e/.build/bundle.cjs'
        case 'name':
          return outputBinaryName
        default:
          return ''
      }
    })

    // Build the single-file bundle
    await esbuild.build({
      entryPoints: [join(__dirname, 'main.ts')],
      bundle: true,
      platform: 'node',
      outfile: join(__dirname, '.build/bundle.cjs')
    })

    await run()
    expect(getInputMock).toHaveBeenCalledTimes(2)
    expect(getInputMock).toHaveBeenCalledWith('bundle', { required: true })
    expect(getInputMock).toHaveBeenCalledWith('name')
    expect(setOutputMock).toHaveBeenCalledTimes(1)
    expect(setOutputMock).toHaveBeenCalledWith(
      'binary-path',
      expect.stringMatching(RegExp(`/.+/${outputBinaryName}`))
    )

    expect(async () =>
      access(join(__dirname, '.build/bin'), constants.X_OK | constants.R_OK)
    ).not.toThrow()

    const result = await promisify(execFile)(
      join(__dirname, `.build/${outputBinaryName}`),
      {
        encoding: 'utf-8'
      }
    )
    expect(typeof result.stdout).toBe('string')
    expect(result.stdout).toContain('hello')
  }, 10_000)
})
