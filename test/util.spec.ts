import { test } from 'zora'
import { objAccess, numToOrder } from '../src/util'

test('objAccess', (t) => {

  const arr = [[[[1234]]]]
  const obj = {
    a: {
      b: {
        c: {
          d: 'hello'
        }
      }
    }
  }

  t.equal(objAccess(arr)(0)(0)(0)(0)(), 1234,
    'Array: access existing value returns the value.')
  t.equal(objAccess(arr)(0)(0)(1)(1)(), undefined,
    'Array: access non-existing value returns undefined.')
  t.equal(objAccess(obj)('a')('b')('c')('d')(), 'hello',
    'Object: access existing value returns the value.')
  t.equal(objAccess(obj)('a')('b')('e')('c')(), undefined,
    'Object: access non-existing value returns undefined.')

})

test('numToOrder', (t) => {

  t.equal(numToOrder(1), '1st', 'Convert 1 to 1st.')
  t.equal(numToOrder(2), '2nd', 'Convert 2 to 2nd.')
  t.equal(numToOrder(3), '3rd', 'Convert 3 to 3rd.')
  t.equal(numToOrder(4), '4th', 'Convert others (4) to nth (4th).')
  t.equal(numToOrder(10), '10th', 'Convert others (10) to nth (10th).')

})