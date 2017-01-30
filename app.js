'use strict'

const reekoh = require('demo-reekoh-node')
const _plugin = new reekoh.plugins.DeviceSync()

const requestPromise = require('request-promise')
const isArray = require('lodash.isarray')
const isPlainObject = require('lodash.isplainobject')
const async = require('async')

let _config = {
  host: 'iotrdmsiotservices-p1942340584trial.hanatrial.ondemand.com',
  username: 'adinglasan@reekoh.com',
  password: 'Feb?0593',
  device_type: '098c95c948ab5b113d21'
}

let _notifyDone = (method) => {
  if (method === 'ready') {
    setImmediate(() => {
      process.send({ type: 'ready' })
    })
  }

  process.send({ done: true, method: method })
}

let _processRequest = (action, device, callback) => {
  let params = {}
  let logTitle = ''
  let apiUrl = `https://${_config.host}/com.sap.iotservices.dms/v2/api/devices`

  if (!isPlainObject(device)) { return _plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${device}`)) }

  switch (action) {

    case 'sync':
      params.method = 'GET'
      params.url = apiUrl
      break

    case 'update':
      params.method = 'PATCH'
      params.url = `${apiUrl}/${device._id}/attributes`
      logTitle = `Device '${device._id}' updated in SAP HCP.`

      params.body = device.attributes
      break

    case 'remove':
      params.method = 'DELETE'
      params.url = `${apiUrl}/${device._id}`
      logTitle = `Device '${device._id}' removed in SAP HCP.`
      break

    case 'add':
      params.method = 'POST'
      params.url = apiUrl
      logTitle = `Device '${device.name}' added in SAP HCP.`

      params.body = {
        id: device._id,
        name: device.name,
        deviceType: _config.device_type,
        attributes: device.attributes
      }

      break
  }

  params.json = true
  params.auth = { user: _config.username, pass: _config.password }

  requestPromise(params)
    .then((object) => {
      if (action === 'sync') {
        return callback(object)
      }

      _notifyDone(params.method)
      _plugin.log(JSON.stringify({
        title: logTitle,
        data: object
      }))
    })
    .catch((error) => {
      _notifyDone(params.method)
      _plugin.logException(error)
    })
}

_plugin.once('ready', () => {
  _plugin.log('Device sync has been initialized.')
  _notifyDone('ready')
})

_plugin.on('sync', () => {
  _processRequest('sync', {}, (devices) => {
    if (!isArray(devices)) {
      return _plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${devices}`))
    }

    async.each(devices, (device, done) => {
      let param = {
        _id: device.id,
        name: device.name,
        metadata: device.attributes ? { sap: { attributes: device.attributes } } : { /* empty */ }
      }

      _plugin.syncDevice(param, done)
        .then(() => {
          done()
        }).catch((err) => {
          done(err)
        })
    }, (err) => {
      if (err) return console.log(err)
      _notifyDone('GET')
    })
  })
})

_plugin.on('adddevice', (device) => {
  _processRequest('add', device)
})

_plugin.on('updatedevice', (device) => {
  _processRequest('update', device)
})

_plugin.on('removedevice', (device) => {
  _processRequest('remove', device)
})
