const path = require('path')
const fs = require('fs')

const { log } = require('./utils')

class TemplateProvider {

  /**
   * @param {string} themeDir 
   */
  constructor(themeDir) {
    this.templateDir = path.join(themeDir, 'layout')
    this.templateMap = {}
  }

  /**
   * Get template as a string with its name.
   * 
   * The name of a template is its filename without extension.
   * @param {string} templateName 
   */
  get(templateName) {
    log.debug(`Get template "${templateName}"`)
    if (typeof templateName === 'string') {
      let template = this.templateMap[templateName]
      if (template) return template
      else return this._load(templateName)
    } else {
      return `${templateName} is not a string`
    }
  }

  /**
   * Load a template as a string into cache and return it.
   * 
   * If loading failed, return an error message string.
   * @param {string} templateName 
   */
  _load(templateName) {
    log.debug(`Load template "${templateName}"`)
    let templatePath = path.join(this.templateDir, `${templateName}.html`)
    try {
      this.templateMap[templateName] =
        fs.readFileSync(templatePath, { encoding: 'utf-8' })
      return this.templateMap[templateName]
    } catch (err) {
      log.debug(err)
      if (templateName.length)
        return `Cannot find "${templateName}.html" in ${this.templateDir}`
      else
        return 'Template name has length 0, please check "template" field of your table on Notion'
    }
  }
}

module.exports = TemplateProvider