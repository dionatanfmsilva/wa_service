'use strict'
/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */

const Env = use('Env')

class InternalApiAuth {
  /**
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Function} next
   */
  async handle({ request, response }, next) {

    const autorization = request.request.headers.authorization

    if (!autorization) {
      return response.status(401).json({ message: 'Token Ausente' })
    }

    const token = autorization.split(' ')[1]


    if (token !== Env.get('WAPP_TOKEN')) {
      return response.status(403).json({ message: 'Acesso negado' })
    }

    await next()

  }
}

module.exports = InternalApiAuth
