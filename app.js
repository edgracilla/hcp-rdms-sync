'use strict'

const reekoh = require('reekoh')
const plugin = new reekoh.plugins.InventorySync()

const async = require('async')
const requestPromise = require('request-promise')
const isPlainObject = require('lodash.isplainobject')

let _processRequest = (action, device, callback) => {
  let params = {}
  let logTitle = ''
  let apiUrl = `https://${plugin.config.host}/com.sap.iotservices.dms/v2/api/devices`

  if (!isPlainObject(device)) { return plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${device}`)) }

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
        deviceType: plugin.config.device_type,
        attributes: device.attributes
      }

      break
  }

  params.json = true
  params.auth = { user: plugin.config.username, pass: plugin.config.password }

  requestPromise(params).then((object) => {
    if (action === 'sync') return callback(object)

    plugin.emit(`${params.method}_OK`)

    plugin.log(JSON.stringify({
      title: logTitle,
      data: object
    }))
  }).catch((error) => {
    plugin.logException(error)
    console.log(error)
  })
}

plugin.once('ready', () => {
  plugin.log('Device sync has been initialized.')
  plugin.emit('init')
})

plugin.on('sync', () => {
  _processRequest('sync', {}, (devices) => {
    if (!Array.isArray(devices)) {
      return plugin.logException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${devices}`))
    }

    async.each(devices, (device, cb) => {
      let param = {
        _id: device.id,
        name: device.name,
        metadata: device.attributes
          ? { sap: { attributes: device.attributes } }
          : { /* empty */ }
      }

      plugin.syncDevice(param).then(() => {
        cb()
      }).catch(cb)
    }, (err) => {
      if (err) return console.log(err)
      plugin.emit('GET_OK')
    })
  })
})

plugin.on('adddevice', (device) => {
  _processRequest('add', device)
})

plugin.on('updatedevice', (device) => {
  _processRequest('update', device)
})

plugin.on('removedevice', (device) => {
  _processRequest('remove', device)
})

module.exports = plugin
