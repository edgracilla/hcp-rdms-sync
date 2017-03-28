/* global describe, it, after, before */
'use strict'

const cp = require('child_process')
const should = require('should')
const amqp = require('amqplib')

const PLUGIN_ID = 'demo.dev-sync'
const BROKER = 'amqp://guest:guest@127.0.0.1/'

let conf = {
  host: 'iotrdmsiotservices-p1942340584trial.hanatrial.ondemand.com',
  device_type: '098c95c948ab5b113d21',
  username: 'adinglasan@reekoh.com',
  password: 'Feb?0593'
}

let _app = null
let _conn = null
let _channel = null

describe('HCP-RDMS Inventory Sync', function () {
  let dummyId = `${Date.now() + 1}`

  before('init', () => {
    process.env.BROKER = BROKER
    process.env.PLUGIN_ID = PLUGIN_ID
    process.env.CONFIG = JSON.stringify(conf)

    amqp.connect(BROKER).then((conn) => {
      _conn = conn
      return conn.createChannel()
    }).then((channel) => {
      _channel = channel
    }).catch((err) => {
      console.log(err)
    })
  })

  after('terminate', function () {
    _conn.close()
  })

  describe('#start', function () {
    it('should start the app', function (done) {
      this.timeout(10000)
      _app = require('../app')
      _app.once('init', done)
    })
  })

  describe('#adddevice', () => {
    it('should add the device', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({
        operation: 'adddevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`,
          attributes: [
            { key: 'SerialNumber', value: 'SN 5121982812' },
            { key: 'IPv4', value: '127.0.0.1' }
          ]
        }
      })))

      _app.on('POST_OK', done)
    })
  })

  describe('#updatedevice', function () {
    it('should update the device', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({
        operation: 'updatedevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`,
          attributes: [
            { key: 'SerialNumber', value: 'xxx' },
            { key: 'IPv4', value: 'xxx' }
          ]
        }
      })))

      _app.on('PATCH_OK', done)
    })
  })

  describe('#removedevice', function () {
    it('should remove the device', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({
        operation: 'removedevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`
        }
      })))

      _app.on('DELETE_OK', done)
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000)
      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))
      _app.on('GET_OK', done)
    })
  })
})
