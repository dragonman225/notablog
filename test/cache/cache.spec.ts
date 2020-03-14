import fs from 'fs'
import { test } from 'zora'
import { Timer, sleep } from '../util'
import { Cache } from '../../src/cache'

test('Cache', async (t) => {
  const timer = new Timer()

  const cache = new Cache(__dirname)
  const namespace = 'test'
  const id = '1234'
  const data = { title: 'test' }
  const fPath = cache.fPath(namespace, id)

  t.equal(typeof cache.get(namespace, id), 'undefined',
    'get() non-existing object should return undefined.')

  cache.set(namespace, id, data)
  t.equal(fs.existsSync(fPath), true,
    'set() should write an object to a file.')

  t.deepEqual(cache.get(namespace, id), data,
    'get() existing object should return the object.')

  timer.pause()

  /** Ensure Date.now() can get a larger value. */
  await sleep(500)

  timer.continue()

  t.equal(cache.shouldUpdate(namespace, id, Date.now()), true,
    'shouldUpdate() query with a timestamp larger than the \
lastModifiedTime of the cache onject should return true.')

  /** Clean up. */
  fs.unlinkSync(fPath)

  timer.stop()
})