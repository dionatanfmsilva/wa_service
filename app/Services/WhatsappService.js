'use strict'

const OS = use('os')
const FS = use('fs')
const Path = use('path')
const Venom = use('venom-bot')
const WppConnect = use('@wppconnect-team/wppconnect')
const Env = use('Env')
const Ws = use('Ws')
const Drive = use('Drive')
const Helpers = use('Helpers')

const Channel = use('App/Models/Channel')

class WhatsappService {


    // Iniciar todos os canais ativos
    static async startService() {

        const channels = await Channel.find({ deleted_at: null, channel: 'whatsapp', active: true })

        for (const channel of channels) {
            WhatsappService.startSession(channel._id.toString())
        }

    }

    // Iniciar sessão WA
    static async startSession(session_name) {

        WhatsappService.sessions = WhatsappService.sessions || [] //start array

        let session = WhatsappService.getSession(session_name)

        if (session == false) { //create new session

            session = WhatsappService.addSesssion(session_name)

        }
        else if (["CLOSED"].includes(session.state)) { //restart session

            session.state = "STARTING"
            session.status = 'notLogged';
            session.client = WhatsappService.initSession(session_name)

        }
        else if (["CONFLICT", "UNPAIRED", "UNLAUNCHED"].includes(session.state)) {

            session.client.then(client => {
                client.useHere()
            })

        }
        else if (['qrReadError', 'autocloseCalled', 'desconnectedMobile', 'browserClose', 'qrReadFail'].includes(session.status)) {

            await WhatsappService.closeSession(session_name)

            await WhatsappService.startSession(session_name);

        }

        return session
    }

    // Busca sessão pelo nome
    static getSession(session_name) {

        for (const session of WhatsappService.sessions || []) {

            if (session_name == session.name) {
                return session
            }
        }

        return false

    }

    // Valida a sessão
    static async getValidSession(session_name) {

        let session = WhatsappService.getSession(session_name)

        if (session.state == 'CLOSED') {
            session = await WhatsappService.startSession(session_name);
        }

        return session;
    }

    // Adiciona uma nova sessão (execução)
    static addSesssion(session_name) {

        const newSession = {
            name: session_name,
            qrcode: false,
            client: false,
            status: 'notLogged',
            state: 'STARTING'
        }

        WhatsappService.sessions.push(newSession)

        newSession.client = WhatsappService.initSession(session_name, 1)

        return newSession
    }

    // Iniciar sessão WAWEB
    static async initSession(session_name, attempts = 2) {

        try {

            const session = WhatsappService.getSession(session_name)

            session.browserSessionToken = null

            if (Env.get('WPP_ENGINE') === 'VENOM') {

                const client = await Venom.create(
                    session_name,
                    (base64Qr, asciiQR, attempts) => WhatsappService.updateQRCode(session, base64Qr),
                    (statusSession, session_name) => WhatsappService.onStatusChanged(session, statusSession),
                    {
                        folderNameToken: 'tokens',
                        headless: true,
                        devtools: false,
                        useChrome: false,
                        debug: false,
                        logQR: false,
                        browserArgs: [
                            '--log-level=3',
                            '--no-default-browser-check',
                            '--disable-site-isolation-trials',
                            '--no-experiments',
                            '--ignore-gpu-blacklist',
                            '--ignore-certificate-errors',
                            '--ignore-certificate-errors-spki-list',
                            '--disable-gpu',
                            '--disable-extensions',
                            '--disable-default-apps',
                            '--enable-features=NetworkService',
                            '--disable-setuid-sandbox',
                            '--no-sandbox',
                            // Extras
                            '--disable-webgl',
                            '--disable-threaded-animation',
                            '--disable-threaded-scrolling',
                            '--disable-in-process-stack-traces',
                            '--disable-histogram-customizer',
                            '--disable-gl-extensions',
                            '--disable-composited-antialiasing',
                            '--disable-canvas-aa',
                            '--disable-3d-apis',
                            '--disable-accelerated-2d-canvas',
                            '--disable-accelerated-jpeg-decoding',
                            '--disable-accelerated-mjpeg-decode',
                            '--disable-app-list-dismiss-on-blur',
                            '--disable-accelerated-video-decode',
                        ],
                        refreshQR: 15000,
                        autoClose: 15000 * attempts,
                        disableSpins: true,
                        disableWelcome: true,
                        createPathFileToken: true,
                        waitForLogin: true
                    },
                    session.browserSessionToken
                )

                session.state = "CONNECTED"

                client.onStateChange(state => WhatsappService.onStateChanged(client, state))

                client.onStreamChange(state => WhatsappService.onStreamChange(client, state))

                return client
            }


            if (Env.get('WPP_ENGINE') === 'WPPCONNECT') {

                const client = await WppConnect.create({
                    session: session.name,
                    catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => WhatsappService.updateQRCode(session, base64Qrimg),
                    statusFind: (statusSession, session_name) => WhatsappService.onStatusChanged(session, statusSession),
                    folderNameToken: 'tokens',
                    headless: true,
                    devtools: false,
                    useChrome: false,
                    debug: false,
                    logQR: false,
                    browserArgs: [
                        '--log-level=3',
                        '--no-default-browser-check',
                        '--disable-site-isolation-trials',
                        '--no-experiments',
                        '--ignore-gpu-blacklist',
                        '--ignore-certificate-errors',
                        '--ignore-certificate-errors-spki-list',
                        '--disable-gpu',
                        '--disable-extensions',
                        '--disable-default-apps',
                        '--enable-features=NetworkService',
                        '--disable-setuid-sandbox',
                        '--no-sandbox',
                        // Extras
                        '--disable-webgl',
                        '--disable-threaded-animation',
                        '--disable-threaded-scrolling',
                        '--disable-in-process-stack-traces',
                        '--disable-histogram-customizer',
                        '--disable-gl-extensions',
                        '--disable-composited-antialiasing',
                        '--disable-canvas-aa',
                        '--disable-3d-apis',
                        '--disable-accelerated-2d-canvas',
                        '--disable-accelerated-jpeg-decoding',
                        '--disable-accelerated-mjpeg-decode',
                        '--disable-app-list-dismiss-on-blur',
                        '--disable-accelerated-video-decode',
                    ],
                    disableSpins: false,
                    disableWelcome: true,
                    updatesLog: false,
                    autoClose: 15000 * attempts,
                    createPathFileToken: true,
                    waitForLogin: true,

                })

                WppConnect.defaultLogger.level = 'silly'

                session.state = "CONNECTED"

                client.onStateChange(state => WhatsappService.onStateChanged(client, state))

                client.onStreamChange(state => WhatsappService.onStreamChange(client, state))

                return client
            }

        } catch (error) {
            console.log(error)
        }

    }

    // Fechar sessão
    static async closeSession(session_name) {

        const session = WhatsappService.getSession(session_name)

        if (session.state == "CLOSED") {
            return false
        }

        if (session.client) {

            await session.client.then(async client => {

                WhatsappService.closeClient(client)

                session.state = "CLOSED"
                session.client = false

            })

            return true
        }

        return false

    }

    // Fechar sessão
    static closeClient(client) {

        try {

            if (!client) return

            setTimeout(async () => {
                await client.close()
            }, 500);

        } catch (error) {
            console.log(error)
        }
    }

    // fazer logout da sessão
    static async logoutSession(session_name) {

        try {

            const session = WhatsappService.getSession(session_name)

            await session.client.then(async client => {

                if (Env.get('WPP_ENGINE') === 'WPPCONNECT') {
                    await client.logout()
                }

                if (Env.get('WPP_ENGINE') === 'VENOM') {
                    await Drive.delete(`${Helpers.appRoot('tokens')}${Path.sep}${session_name}.data.json`)
                }

                setTimeout(async () => {
                    await client.close()
                }, 500);

                session.state = "CLOSED"
                session.client = false

            })

            return true

        } catch (err) {
            return false
        }

    }

    // Status da sessão (QRCode Lido)
    static async getSessionStatus(session_name) {

        try {

            const session = WhatsappService.getSession(session_name)

            if (!session) {
                return false
            }

            console.log(session.status)

            if (['qrReadFail', 'notLogged', 'desconnectedMobile', 'qrReadError'].includes(session.status)) {
                return false
            }

            return true

        } catch (error) {
            return false
        }
    }

    // Status da conexão com celular e bateria
    static async getDeviceStatus(session_name) {

        try {

            const session = WhatsappService.getSession(session_name)

            const client = await session.client

            const state = await client.getConnectionState()
            const batery = await client.getBatteryLevel()
            const connected = await client.isConnected()

            return { state, batery, connected }

        } catch (error) {
            return { state: 'DISCONNECTED', batery: 'UNKNOW', connected: false }
        }

    }

    //-----------------------------------------------

    // Deletar uma mensagem
    static async deleteMessage(session_name, number, msg_id) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async client => {
            return await client.deleteMessage('55' + number + '@c.us', [msg_id])
        })

        return true

    }

    // Enviar mensagem de texto para contato
    static async sendText(session_name, number, text) {

        const session = await WhatsappService.getValidSession(session_name)

        return await session.client.then(async client => {
            return await client.sendText('55' + number + '@c.us', text)
        })

    }

    // Enviar mensagem de texto para storie
    static async sendTextToStorie(session_name, text) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async client => {
            return await client.sendText('status@broadcast', text)
        })

        return true

    }

    // Enviar arquivo para contato
    static async sendFile(session_name, number, base64Data, fileName, caption) {

        const session = await WhatsappService.getValidSession(session_name)

        return await session.client.then(async (client) => {

            const folderName = FS.mkdtempSync(Path.join(OS.tmpdir(), session.name + '-'))

            const filePath = Path.join(folderName, fileName)

            FS.writeFileSync(filePath, base64Data, 'base64')

            return await client.sendFile('55' + number + '@c.us', filePath, fileName, caption)
        })

    }

    // Enviar imagem para storie
    static async sendImageStorie(session_name, base64Data, fileName, caption) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {

            const folderName = FS.mkdtempSync(Path.join(OS.tmpdir(), session.name + '-'))

            const filePath = Path.join(folderName, fileName)

            FS.writeFileSync(filePath, base64Data, 'base64')

            return await client.sendFile('status@broadcast', filePath, fileName, caption)

        })

        return true

    }

    // Enviar VCard para contato
    static async sendContactVcard(session_name, number, numberCard, nameCard) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {
            return await client.sendContactVcard('55' + number + '@c.us', numberCard + '@c.us', nameCard)
        })

        return true

    }

    // Enviar mensage de voz
    static async sendVoice(session_name, number, voice) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {
            return await client.sendVoiceBase64('55' + number + '@c.us', voice)
        })

        return true
    }

    // Enviar localização
    static async sendLocation(session_name, number, lat, long, local) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {
            return await client.sendLocation('55' + number + '@c.us', lat, long, local)
        })

        return true
    }

    // Enviar link com pre vizualização
    static async sendLinkPreview(session_name, number, url, caption) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {
            return await client.sendLinkPreview('55' + number + '@c.us', url, caption)
        })

        return true
    }

    // Buscar todos os chats com novas mensagens
    static async getAllChatsNewMsg(session_name) {

        const session = await WhatsappService.getValidSession(session_name)

        const resultGetAllChatsNewMsg = await session.client.then(async (client) => {
            return client.getAllChatsNewMsg()
        })

        return resultGetAllChatsNewMsg

    }

    // Buscar todas mensagens não lidas
    static async getAllUnreadMessages(session_name) {

        const session = await WhatsappService.getValidSession(session_name)

        var resultGetAllUnreadMessages = await session.client.then(async (client) => {
            return await client.getAllUnreadMessages()
        })

        return resultGetAllUnreadMessages

    }

    // Checar se o número é válido
    static async checkNumberStatus(session_name, number) {

        const session = await WhatsappService.getValidSession(session_name)

        const resultcheckNumberStatus = await session.client.then(async (client) => {
            return await client.checkNumberStatus('55' + number + '@c.us')
        })

        return resultcheckNumberStatus

    }

    // Dados do perfil do usuário
    static async getNumberProfile(session_name, number) {

        const session = await WhatsappService.getValidSession(session_name)

        const resultgetNumberProfile = await session.client.then(async (client) => {
            return await client.getNumberProfile('55' + number + '@c.us')
        })

        return resultgetNumberProfile

    }

    //-----------------------------------------------

    // Mensagem recebida
    static async setOnMessageReceived(session_name, callback) {

        const session = await WhatsappService.getValidSession(session_name)

        await session.client.then(async (client) => {
            client.onMessage(message => callback(client, message))
        })

    }

    // QRCode Alterado
    static updateQRCode(session, base64Qr) {

        session.state = "QRCODE"
        session.qrcode = base64Qr

        WhatsappService.updateTopic(session.name, 'qrupdate', base64Qr)

    }

    // Atualizar status Web Socket
    static updateTopic(session_name, event, data) {

        const channel = Ws.getChannel('whatsapp:*')

        const topic = channel.topic(`whatsapp:${session_name}`)

        if (topic) {
            topic.broadcast('call', { event, data })
        }
    }

    // Estado alterado
    static onStateChanged(client, state) {

        if (['CONFLICT'].includes(state)) {
            client.useHere();
        }

        if (['UNPAIRED'].includes(state)) {
            WhatsappService.closeClient(client)
        }

        session.state = state
        console.log('onStateChanged', state)
    }

    // Status alterado
    static onStatusChanged(session, status) {
        session.status = status

        if (['autocloseCalled'].includes(status)) {
            WhatsappService.updateTopic(session.name, 'qrfail', null)
        }
        else if (['inChat', 'chatsAvailable'].includes(status)) {
            WhatsappService.updateTopic(session.name, 'qrsuccess', null)
        }
        else if (['qrReadFail'].includes(status)){
            WhatsappService.closeSession(session.name)
        }

        console.log('onStatusChanged', status)
    }

    //-----------------------------------------------

    // Estado da conexão
    static onStreamChange(client, state) {

        session.state = state
        console.log('onStreamChange', state)

        if (state == 'DISCONNECTED') {
            WhatsappService.closeClient(client)
        }
    }





}

module.exports = WhatsappService