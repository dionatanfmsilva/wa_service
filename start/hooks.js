'use strict';

const { hooks } = use('@adonisjs/ignitor')


hooks.after.httpServer(() => {

    // Iniciar serviço whatsapp
    const WhatsAppService = use('App/Services/WhatsAppService')

    WhatsAppService.startService()

})

hooks.after.providersBooted(() => {

    const Validator = use('Validator')

    const ValidateObjectId = async (data, field, message, args, get) => {

        const value = get(data, field)

        const valid = new RegExp("^[0-9a-fA-F]{24}$").test(value)

        if (!valid) {
            return new Promise(() => { throw message });
        }

    }

    Validator.extend('objectId', ValidateObjectId)

})