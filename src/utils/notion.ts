const dashIDLen = '0eeee000-cccc-bbbb-aaaa-123450000000'.length
const noDashIDLen = '0eeee000ccccbbbbaaaa123450000000'.length

export function getPageIDFromPageURL(str: string): string {
  let splitArr = str.split('/')
  splitArr = (splitArr.pop() || '').split('-')

  const pageID = splitArr.pop()
  if (pageID && pageID.length === noDashIDLen) {
    return toDashID(pageID)
  } else {
    throw new Error(`Cannot get pageID from ${str}`)
  }
}

export function getPageIDFromCollectionPageURL(str: string): string {
  let splitArr = str.split('/')
  splitArr = (splitArr.pop() || '').split('-')
  splitArr = (splitArr.pop() || '').split('?')

  const pageID = splitArr[0]
  if (pageID && pageID.length === noDashIDLen) {
    return toDashID(pageID)
  } else {
    throw new Error(`Cannot get pageID from ${str}`)
  }
}

export function getBookmarkLinkFromPageURL(str: string): string {
  let splitArr = str.split('/')
  splitArr = (splitArr.pop() || '').split('-')
  splitArr = (splitArr.pop() || '').split('#')

  const blockID = splitArr[1]
  if (blockID && blockID.length === noDashIDLen) {
    return `#${toDashID(blockID)}`
  } else {
    return str
  }
}

export function toDashID(str: string): string {
  if (isValidDashID(str)) {
    return str
  }

  const s = str.replace(/-/g, '')
  if (s.length !== noDashIDLen) {
    return str
  }

  const res =
    str.substring(0, 8) +
    '-' +
    str.substring(8, 12) +
    '-' +
    str.substring(12, 16) +
    '-' +
    str.substring(16, 20) +
    '-' +
    str.substring(20)
  return res
}

export function isValidDashID(str: string): boolean {
  if (str.length !== dashIDLen) {
    return false
  }
  if (str.indexOf('-') === -1) {
    return false
  }
  return true
}
