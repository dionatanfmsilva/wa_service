'use strict'

const AppController = use("./AppController")

const Env = use('Env')
const Drive = use('Drive')
const Channel = use('App/Models/Channel')
const WhatsAppService = use('App/Services/WhatsAppService')

class WhatsappController extends AppController {

    // Iniciar ou reiniciar sessão
    async startSession({ request, response }) {

        const { channel } = request.get()

        let session = await WhatsAppService.startSession(channel)

        if (!session) {
            return response.status(500).json({ message: 'Falha ao iniciar sessão.' });
        }

        await Channel.updateOne({ _id: channel }, { active: true })

        return response.status(200).json({ message: 'Sessão iniciada com sucesso' });

    }

    // Status de conexão pareado
    async getSessionStatus({ request, response }) {

        const { channel } = request.get()

        const res = await WhatsAppService.getSessionStatus(channel);

        response.status(200).json(res);

    }

    // Status de conexão com celular e bateria
    async getDeviceStatus({ request, response }) {

        const { channel } = request.get()

        const res = await WhatsAppService.getDeviceStatus(channel);

        response.status(200).json(res);

    }

    // Desconectar Sessão
    async disconnect({ request, response }) {

        const { channel } = request.post()

        await WhatsAppService.logoutSession(channel);

        await Channel.updateOne({ _id: channel }, { active: true })

        response.status(200).json(true);
    }

    
    // Enviar mensagem Texto
    async sendText({ request, response }) {

        try {

            const validation_err = await this.validateRules(request, {
                channel: 'required|objectId',
                recipient: 'required|string',
                body: 'required|string'
            })

            if (validation_err) {
                return response.status(422).json(validation_err)
            }

            const { channel, recipient, body } = request.post()

            const waResponse = await WhatsAppService.sendText(channel, recipient, body)

            const wa_id = WhatsappController._getWaId(waResponse)

            return response.status(200).json({ wa_id })

        } catch (error) {
            return this.httpError(response, error, 'Falha ao enviar mensagem')
        }
    }

    // Enviar arquivo
    async sendFile({ request, response }) {

        try {

            const validation_err = await this.validateRules(request, {
                channel: 'required|objectId',
                recipient: 'required|string',
                body: 'required|string',
                file_path: 'required|string'
            })

            if (validation_err) {
                return response.status(422).json(validation_err)
            }

            const { channel, recipient, body, file_path } = request.post()

            const { Body } = await Drive.disk('s3').getObject(file_path)

            const base64Data = Body.toString('base64')

            const waResponse = await WhatsAppService.sendFile(channel, recipient, base64Data, body, null)

            const wa_id = WhatsappController._getWaId(waResponse)

            return response.status(200).json({ wa_id })

        } catch (error) {
            return this.httpError(response, error, 'Falha ao enviar mensagem')
        }
    }

    // Capturar Id da mensagem de acordo com o vendor
    static _getWaId(waResponse) {

        let wa_id;

        if (Env.get('WPP_ENGINE') === 'WPPCONNECT') {
            wa_id = waResponse.id
        }

        if (Env.get('WPP_ENGINE') === 'VENOM') {
            wa_id = waResponse.to._serialized
        }

        return wa_id

    }

}

module.exports = WhatsappController
