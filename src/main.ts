import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import {
  access,
  readFile,
  constants,
  realpath,
  chmod,
  mkdtemp,
  writeFile
} from 'fs/promises'
import { platform, tmpdir } from 'os'
import { dirname, isAbsolute, join } from 'path'
import { inject } from 'postject'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  let bundleEntrypoint = core.getInput('bundle')
  if (!bundleEntrypoint) {
    throw new Error('The input "bundle" is required')
  }

  if (!isAbsolute(bundleEntrypoint)) {
    bundleEntrypoint = join(__dirname, bundleEntrypoint)
  }
  core.debug(`Resolved bundle file with absolute path: ${bundleEntrypoint}`)

  try {
    await access(bundleEntrypoint, constants.R_OK)
  } catch (err) {
    core.error('The config file does not exist or was inaccessible:')
    if (err instanceof Error) {
      core.error(err)
    }
    throw err
  }

  const buildDirectory = await mkdtemp(
    join(tmpdir(), 'node-sea-github-action-')
  )

  const blobFilepath = join(buildDirectory, 'sea.blob')
  await writeFile(
    join(buildDirectory, 'sea-config.json'),
    JSON.stringify({
      // SEA CONFIGURATION VALUES
      main: bundleEntrypoint,
      output: blobFilepath,
      disableExperimentalSEAWarning: true
    })
  )

  try {
    const nodePath = await realpath(await io.which('node', true))
    core.debug(`Found node path: ${nodePath}`)
    const binaryPath = join(buildDirectory, 'bin')
    core.debug(`Copying node binary to path: ${binaryPath}`)
    await io.cp(nodePath, binaryPath)
    await chmod(binaryPath, 0o751)
  } catch (err) {
    core.error(
      'Node must be installed on the system - ensure the `setup-node` action runs before this one.'
    )
    if (err instanceof Error) {
      core.error(err)
    }
    throw err
  }

  const execOptions: exec.ExecOptions = {
    cwd: buildDirectory
  }
  try {
    await exec.exec(
      'node',
      ['--experimental-sea-config', 'sea-config.json'],
      execOptions
    )

    platform() === 'darwin' &&
      (await exec.exec('codesign', ['--remove-signature', 'bin'], execOptions))

    await inject(
      join(buildDirectory, 'bin'),
      'NODE_SEA_BLOB',
      await readFile(blobFilepath),
      {
        sentinelFuse: 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
        machoSegmentName: 'NODE_SEA'
      }
    )

    platform() === 'darwin' &&
      (await exec.exec('codesign', ['--sign', '-', 'bin'], execOptions))
    await io.cp(join(buildDirectory, 'bin'), dirname(bundleEntrypoint))
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.error(error)
      core.setFailed(error.message)
    } else {
      core.error(`Unhandled throw was not of type Error: ${error}`)
      core.setFailed(`UNEXPECTED ERROR: Unhandled throw, please check logs`)
    }
  }
}
