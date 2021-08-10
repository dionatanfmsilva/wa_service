'use strict'

class WhatsAppWSController {

  constructor({ socket, request }) {
    this.socket = socket
    this.request = request
  }

  onMessage() {
  }

  onClose() {
  }

  onError() {
  }

}

module.exports = WhatsAppWSController
