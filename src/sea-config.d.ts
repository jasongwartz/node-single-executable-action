/* Reference:
https://nodejs.org/api/single-executable-applications.html#generating-single-executable-preparation-blobs

The configuration currently reads the following top-level fields:
{
  "main": "/path/to/bundled/script.js",
  "output": "/path/to/write/the/generated/blob.blob",
  "disableExperimentalSEAWarning": true, // Default: false
  "useSnapshot": false,  // Default: false
  "useCodeCache": true, // Default: false
  "assets": {  // Optional
    "a.dat": "/path/to/a.dat",
    "b.txt": "/path/to/b.txt"
  }
}
*/

export interface SEAConfig {
  main: string
  output: string
  disableExperimentalSEAWarning?: boolean
  useSnapshot?: boolean
  useCodeCache?: boolean
  assets?: Record<string, string>
}
