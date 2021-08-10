'use strict'

const BaseModel = use('MongooseModel')

class User extends BaseModel {

  static get schema() {
  }

  static get schemaOptions() {
    return { collection: 'users' }
  }

}

module.exports = User.buildModel('User')
