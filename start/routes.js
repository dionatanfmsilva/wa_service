'use strict'

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
|
| Http routes are entry points to your web application. You can create
| routes for different URLs and bind Controller actions to them.
|
| A complete guide on routing is available here.
| http://adonisjs.com/docs/4.1/routing
|
*/

const Route = use('Route')

Route.group('auth', () => {

  Route.get('/whatsapp/start', 'WhatsappController.startSession')
  Route.get('/whatsapp/session', 'WhatsappController.getSessionStatus')
  Route.get('/whatsapp/device', 'WhatsappController.getDeviceStatus')
  Route.post('/whatsapp/diconnect', 'WhatsappController.disconnect')

  Route.post('/whatsapp/text', 'WhatsappController.sendText')
  Route.post('/whatsapp/file', 'WhatsappController.sendFile')

}).prefix('v1').middleware('auth')


Route.group('internal', () => {

  Route.get('/whatsapp/start', 'WhatsappController.startSession')
  Route.get('/whatsapp/session', 'WhatsappController.getSessionStatus')
  Route.get('/whatsapp/device', 'WhatsappController.getDeviceStatus')
  Route.post('/whatsapp/diconnect', 'WhatsappController.disconnect')

  Route.post('/whatsapp/text', 'WhatsappController.sendText')
  Route.post('/whatsapp/file', 'WhatsappController.sendFile')

}).prefix('v1/internal').middleware('internal')