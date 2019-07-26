const downloadPageAsTree = require('notionast-util-from-notionapi')

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
  let rawTable = (await downloadPageAsTree(pageID, notionAgent))['raw_value']

  /**
   * The site metadata
   * @typedef {Object} NotablogMetadata
   * @property {string} icon
   * @property {string} title
   */
  /**
   * @type {NotablogMetadata}
   */
  let global = {
    icon: '',
    title: rawTable.name
  }

  /**
   * Create map for random_string -> property_name.
   * Notion uses random strings in schema to prevent probable repeated
   * property names defined by user.
   */
  let schemaMap = {}
  for (let [key, value] of Object.entries(rawTable.schema)) {
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
  rawTable.schema[schemaMap['tags']].options.forEach(tag => {
    Object.defineProperty(tagColorMap, tag.value, {
      value: `${classPrefix}${tag.color}`,
      writable: true
    })
  })

  /**
   * Each `post` contains metadata needed to fetch and render a page in the
   * fetch pipeline.
   */
  let posts = rawTable.data.map(row => {
    return {
      pageID: row.id,
      title: row.properties[schemaMap['title']],
      /**
       * Structure of tags looks like this:
       * { '<random_string>': [ [ 'css,web' ] ] }
       */
      tags: row.properties[schemaMap['tags']][0][0].split(',').map(tag => {
        return {
          value: tag,
          color: tagColorMap[tag]
        }
      }),
      icon: row.format
        ? row.format['page_icon']
          ? row.format['page_icon']
          : ''
        : '',
      /** Description is StyledString[]. */
      description: row.properties[schemaMap['description']],
      createdTime: row['created_time'],
      lastEditedTime: row['last_edited_time']
    }
  })

  /**
   * Reverse the posts array so that the most recent post is at the top.
   */
  return {
    global, posts: posts.reverse()
  }

}