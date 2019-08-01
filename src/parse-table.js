const downloadPageAsTree = require('nast-util-from-notionapi')

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
   * Create map for property_name -> random_string.
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

  let about = rawTable.data
    .find(row => {
      return row.properties[schemaMap['type']][0][0] === 'about'
    })

  /**
   * The site metadata
   * @typedef {Object} NotablogMetadata
   * @property {string} icon
   * @property {string} title
   * @property {string} aboutPageLink
   */
  /**
   * @type {NotablogMetadata}
   */
  let global = {
    icon: '',
    title: rawTable.name,
    aboutPageLink: about ? `${about.id}.html` : ''
  }

  /**
   * Each `post` contains metadata of the post.
   */
  let posts = rawTable.data
    .filter(row => {
      return row.properties != null
    })
    .map(row => {
      return {
        pageID: row.id,
        title: row.properties[schemaMap['title']],
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
        icon: row.format
          ? row.format['page_icon']
            ? row.format['page_icon']
            : ''
          : '',
        /** Raw description is StyledString[]. */
        description: row.properties[schemaMap['description']]
          ? row.properties[schemaMap['description']]
          : [],
        createdTime: row['created_time'],
        lastEditedTime: row['last_edited_time'],
        /** Hide a page from index if it's not a post. */
        hideFromIndex: row.properties[schemaMap['type']][0][0] !== 'post'
      }
    })

  /**
   * Sort the posts so that the most recent post is at the top.
   */
  return {
    global,
    posts: posts.sort((post1, post2) => post1.createdTime > post2.createdTime)
  }

}