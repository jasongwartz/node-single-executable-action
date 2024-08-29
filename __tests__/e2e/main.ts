// Import a third-party library to make sure bundling is working
import chalk from 'chalk'
import { getAsset, isSea } from 'node:sea'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const main = async (): Promise<void> => {
  const packageJson = isSea()
    ? getAsset('package.json', 'utf-8')
    : await readFile(join(__dirname, '../../package.json'), 'utf-8')

  console.log(
    chalk.red.bgCyan.bold('hello!'),
    'from demo app version',
    chalk.green.bgGrey.italic(JSON.parse(packageJson).version)
  )
}

void main()
