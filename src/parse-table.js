const { getOnePageAsTree } = require('../../notajs/packages/nast-util-from-notionapi')

const { getPageIDFromNotionDatabaseURL } = require('./notion-utils')

module.exports = {
  parseTable
}

/**
 * Extract interested data for blog generation from a Notion table.
 * @param {string} notionDatabaseURL 
 * @param {NotionAgent} notionAgent 
 */
async function parseTable(notionDatabaseURL, notionAgent) {
  let pageID = getPageIDFromNotionDatabaseURL(notionDatabaseURL)
  let pageCollection = (await getOnePageAsTree(pageID, notionAgent))

  /**
   * Create map for property_name -> random_string.
   * Notion uses random strings in schema to prevent probable repeated
   * property names defined by user.
   */
  let schemaMap = {}
  for (let [key, value] of Object.entries(pageCollection.schema)) {
    Object.defineProperty(schemaMap, value.name, {
      value: key,
      writable: true
    })
  }

  /**
   * Create map for tag -> color.
   */
  let tagColorMap = {}
  let classPrefix = 'tag-'
  pageCollection.schema[schemaMap['tags']].options.forEach(tag => {
    Object.defineProperty(tagColorMap, tag.value, {
      value: `${classPrefix}${tag.color}`,
      writable: true
    })
  })

  /** Remove empty rows in collection */
  let pagesValid = pageCollection.blocks
    .filter(page => {
      return page.properties != null
    })

  /** Get custom url pages */
  let pagesWithCustomUrl = pagesValid
    .filter(page => {
      let urlProp = page.properties[schemaMap['url']]
      if (urlProp != null) return urlProp[0][0].length > 0
      else return false
    })
  let idUrlMap = {}
  pagesWithCustomUrl.forEach(page => {
    idUrlMap[page.id] = page.properties[schemaMap['url']][0][0].replace(/\/|\\/g, '')
  })

  /** Get hidden pages */
  let pagesHidden = pagesValid
    .filter(page => {
      let hiddenProp = page.properties[schemaMap['hidden']]
      if (hiddenProp != null) return hiddenProp[0][0] === 'Yes'
      else return false
    })
  let idHiddenMap = {}
  pagesHidden.forEach(page => {
    idHiddenMap[page.id] = true
  })

  /**
   * The site metadata
   * @typedef {Object} NotablogMetadata
   * @property {string} icon
   * @property {string} cover
   * @property {string} title
   * @property {{[key: string]: string}} idUrlMap - key: id, value: url
   * @property {{[key: string]: boolean}} idHiddenMap - key: id, value: hidden
   */
  /**
   * @type {NotablogMetadata}
   */
  let global = {
    icon: pageCollection.icon,
    cover: pageCollection.cover,
    title: pageCollection.name,
    description: pageCollection.description,
    idUrlMap,
    idHiddenMap
  }

  /**
   * Convert page structure
   */
  let pagesConverted = pagesValid
    .map(row => {
      return {
        id: row.id,
        title: row.title,
        /**
         * Raw tags looks like this:
         * { '<random_string>': [ [ 'css,web' ] ] }
         */
        tags: row.properties[schemaMap['tags']]
          ? row.properties[schemaMap['tags']][0][0].split(',').map(tag => {
            return {
              value: tag,
              color: tagColorMap[tag]
            }
          })
          : [],
        icon: row.icon,
        cover: row.cover,
        /** Raw description is StyledString[]. */
        description: row.properties[schemaMap['description']]
          ? row.properties[schemaMap['description']]
          : [],
        createdTime: row.createdTime,
        lastEditedTime: row.lastEditedTime
      }
    })

  /**
   * Sort the pagesConverted so that the most recent post is at the top.
   */
  return {
    global,
    posts: pagesConverted.sort((post1, post2) => {
      if (post1.createdTime > post2.createdTime) return -1
      else if (post1.createdTime < post2.createdTime) return 1
      else return 0
    })
  }

}