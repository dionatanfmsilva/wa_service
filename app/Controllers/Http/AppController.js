'use strict'

const { validateAll } = use('Validator')

const Logger = use('Logger')
const Env = use('Env')

class AppController {

    async validateRules(request, rules) {

        const messages = {
            'required': 'Campo obrigatório',
            'objectId': 'Campo inválido',
        }

        const validation = await validateAll(request.all(), rules, messages)

        if (validation.fails()) {
            return validation.messages()
        } else {
            return false
        }

    }

    
    httpError(response, error, message){

        const method = response.request.method
        const url = response.request.url

        const transport = Env.get('NODE_ENV') == 'development' ? 'console' : 'file'
        
        Logger.transport(transport).error(`[${method}] ${url}`, error)

        return response.status(500).json({ message })
    }

}

module.exports = AppController