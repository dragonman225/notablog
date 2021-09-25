import fs from 'fs'
import path from 'path'
import { log } from './utils/misc'

interface Template {
  content: string
  filePath: string
}
export class TemplateProvider {
  private templateDir: string
  private templateMap: {
    [templateName: string]: string
  }

  constructor(templateDir: string) {
    this.templateDir = templateDir
    this.templateMap = {}
  }

  /**
   * Get template as a string by its name.
   *
   * The name of a template is its filename without extension.
   */
  get(templateName: string): Template {
    log.debug(`Get template "${templateName}"`)

    const template = this.templateMap[templateName]
    const templatePath = this._templatePath(templateName)

    if (template) {
      return { content: template, filePath: templatePath }
    } else {
      return { content: this._load(templateName), filePath: templatePath }
    }
  }

  /**
   * Load a template as a string into cache and return it.
   *
   * If failed to load, return an error string.
   */
  private _load(templateName: string) {
    log.debug(`Load template "${templateName}"`)
    const templatePath = this._templatePath(templateName)
    try {
      this.templateMap[templateName] = fs.readFileSync(templatePath, {
        encoding: 'utf-8',
      })
      return this.templateMap[templateName]
    } catch (err) {
      log.warn(err)
      if (templateName.length)
        return `Cannot find "${templateName}.html" \
in "${this.templateDir}".`
      else
        return 'The template name has zero length, \
please check the "template" field in your Notion table.'
    }
  }

  /**
   * Get the path of a template file.
   */
  private _templatePath(templateName: string) {
    return path.join(this.templateDir, `${templateName}.html`)
  }
}
