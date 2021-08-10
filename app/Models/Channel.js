'use strict'

const BaseModel = use('MongooseModel')

class Channel extends BaseModel {

  static get schema () {
  }

  static get schemaOptions() {
    return { collection: 'channels' }
  }
}

module.exports = Channel.buildModel('Channel')
