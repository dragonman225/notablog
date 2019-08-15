const path = require('path')
const fs = require('fs')

const DEBUG_EN = false

class TemplateProvider {

  /**
   * @param {string} themeDir 
   */
  constructor(themeDir) {
    this.templateDir = path.join(themeDir, 'layout')
    this.templateMap = {}
  }

  /**
   * Get template as string with its name
   * @param {string} templateName 
   */
  get(templateName) {
    if (DEBUG_EN) console.log(`Get template ${templateName}`)
    if (typeof templateName === 'string') {
      let template = this.templateMap[templateName]
      if (template) return template
      else return this._load(templateName)
    } else {
      return `${templateName} is not a string`
    }
  }

  _load(templateName) {
    if (DEBUG_EN) console.log(`Load template ${templateName}`)
    let templatePath = path.join(this.templateDir, `${templateName}.html`)
    try {
      this.templateMap[templateName] =
        fs.readFileSync(templatePath, { encoding: 'utf-8' })
      return this.templateMap[templateName]
    } catch (err) {
      console.log(err)
      return `Cannot find ${templateName}.html in ${this.templateDir}`
    }
  }
}

module.exports = TemplateProvider