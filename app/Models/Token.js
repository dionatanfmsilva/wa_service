'use strict'

const TokenMongoose = use('AdonisMongoose/Src/Token')

class Token extends TokenMongoose {

  static get schema() {
  }

  static get schemaOptions() {
    return { collection: 'user_tokens' }
  }

}

module.exports = Token.buildModel('Token')