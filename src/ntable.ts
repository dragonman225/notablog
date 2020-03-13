import { getPageIDFromPageURL } from "./notion-utils"

interface IProperty {
  id: string
  type: string
  records: Map<IRecord, ICell>
}

interface IRecord {
  id: string
  properties: Map<IProperty, ICell>
}

interface ICell {
  property: IProperty
  record: IRecord
  value: any
}

interface ITable {
  id: string
  schema: IProperty[]
  records: IRecord[]
}

class NTextProperty implements IProperty {
  id: string
  type: "text"
  records: Map<NPageRecord, NCell>

  /** Extended properties. */
  name: string

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    this.id = id
    this.name = rawProperty.name
    this.type = "text"
    this.records = new Map()
  }
}

class NCheckboxProperty implements IProperty {
  id: string
  type: "checkbox"
  records: Map<NPageRecord, NCell>

  /** Extended properties. */
  name: string

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    this.id = id
    this.name = rawProperty.name
    this.type = "checkbox"
    this.records = new Map()
  }
}

type SelectOption = {
  id: string
  color: Notion.Collection.ColumnPropertyOptionColor
  value: string
}

class NSelectProperty implements IProperty {
  id: string
  type: "select"
  records: Map<NPageRecord, NCell>

  /** Extended properties. */
  name: string
  options: SelectOption[]

  constructor(id: string, rawProperty: Notion.Collection.ColumnProperty) {
    this.id = id
    this.name = rawProperty.name
    this.type = "select"
    this.records = new Map()
    this.options = rawProperty.options || []
  }
}

type NProperty = NTextProperty | NCheckboxProperty | NSelectProperty

class NPageRecord implements IRecord {
  id: string
  properties: Map<NProperty, NCell>

  /** Extended properties. */
  uri: NAST.URI
  title: NAST.SemanticString[]
  icon?: NAST.Emoji | NAST.PublicUrl
  cover?: NAST.PublicUrl
  coverPosition: number
  fullWidth: boolean

  constructor(rawPage: NAST.Page) {
    this.id = getPageIDFromPageURL(rawPage.uri)
    this.properties = new Map()

    this.uri = rawPage.uri
    this.title = rawPage.title
    this.icon = rawPage.icon
    this.cover = rawPage.cover
    this.coverPosition = rawPage.coverPosition
    this.fullWidth = rawPage.fullWidth
  }
}

class NTextCell implements ICell {
  property: NTextProperty
  record: NPageRecord
  value: NAST.SemanticString[]

  constructor(property: NTextProperty, record: NPageRecord,
    rawValue: NAST.SemanticString[]) {
    this.property = property
    this.record = record
    this.value = rawValue
  }
}

class NCheckboxCell implements ICell {
  property: NCheckboxProperty
  record: NPageRecord
  value: boolean

  constructor(property: NCheckboxProperty, record: NPageRecord,
    rawValue: NAST.SemanticString[]) {
    this.property = property
    this.record = record
    this.value = rawValue ? rawValue[0][0] === "Yes" : false
  }
}

class NSelectCell implements ICell {
  property: NSelectProperty
  record: NPageRecord
  value: SelectOption | undefined

  constructor(property: NSelectProperty, record: NPageRecord,
    rawValue: NAST.SemanticString[]) {
    this.property = property
    this.record = record

    const optionNames = rawValue ? rawValue[0][0].split(",") : []
    this.value = property.options.find(o => o.value === optionNames[0])
  }
}

type NCell = NTextCell | NCheckboxCell | NSelectCell

export class NTable implements ITable {
  id: string
  schema: NProperty[]
  records: NPageRecord[]

  constructor(rawTable: NAST.Collection) {
    this.id = getPageIDFromPageURL(rawTable.uri)

    const rawTableColumnProps = rawTable.views[0].format.table_properties
    /**
     * Using rawTableColumnProps to initialize schema make the order of 
     * properties match the order of columns in the UI.
     */
    if (rawTableColumnProps) {
      this.schema = rawTableColumnProps
        /** Filter out properties that do not exist in schema. */
        .filter(tableProperty => rawTable.schema[tableProperty.property])
        .map(tableProperty => {
          const propertyId = tableProperty.property
          const rawProperty = rawTable.schema[propertyId]
          return createNProperty(propertyId, rawProperty)
        })
    } else {
      this.schema = Object.entries(rawTable.schema).map(tuple => {
        const [propertyId, rawProperty] = tuple
        return createNProperty(propertyId, rawProperty)
      })
    }

    this.records = []
    rawTable.children.forEach(rawPage => {
      const record = new NPageRecord(rawPage)
      this.records.push(record)
      this.schema.forEach(property => {
        const rawPropertyValue = (rawPage.properties || {})[property.id]
        const cell = createNCell(property, record, rawPropertyValue)
        property.records.set(record, cell)
        record.properties.set(property, cell)
      })
    })
  }

  /** Print the table structure so you can see what it looks like. */
  peekStructure() {
    let head = ""
    for (let i = 0; i < this.schema.length; i++) {
      head += this.schema[i].constructor.name + " "
    }
    console.log(head)
    console.log("".padEnd(head.length, "-"))
    for (let i = 0; i < this.records.length; i++) {
      const record = this.records[i]
      let row = ""
      record.properties.forEach((cell, property) => {
        row += cell.constructor.name
          .padEnd(property.constructor.name.length) + " "
      })
      row += "-> " + record.constructor.name
      console.log(row)
    }
  }
}

function createNProperty(
  propertyId: Notion.Collection.ColumnID,
  rawProperty: Notion.Collection.ColumnProperty
) {
  switch (rawProperty.type) {
    case "checkbox":
      return new NCheckboxProperty(propertyId, rawProperty)
    case "select":
      return new NSelectProperty(propertyId, rawProperty)
    default:
      return new NTextProperty(propertyId, rawProperty)
  }
}

function createNCell(
  property: NProperty,
  record: NPageRecord,
  rawValue: NAST.SemanticString[]
) {
  switch (property.type) {
    case "checkbox":
      return new NCheckboxCell(property, record, rawValue)
    case "select":
      return new NSelectCell(property, record, rawValue)
    default:
      return new NTextCell(property, record, rawValue)
  }
}