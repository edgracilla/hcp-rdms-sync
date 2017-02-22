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

describe('HCP-RDMS Device Sync', function () {
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

  after('terminate child process', function () {
    this.timeout(10000)

    setTimeout(() => {
      _conn.close()
      _app.kill('SIGKILL')
    }, 4500)
  })

  describe('#spawn', () => {
    it('should spawn a child process', () => {
      should.ok(_app = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', () => {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(10000)

      _app.on('message', function (message) {
        if (message.type === 'ready') { done() }
      })
    })
  })

  describe('#adddevice', () => {
    it('should add the device', function (done) {
      this.timeout(10000)

      let dummyData = {
        operation: 'adddevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`,
          attributes: [
            { key: 'SerialNumber', value: 'SN 5121982812' },
            { key: 'IPv4', value: '127.0.0.1' }
          ]
        }}

      // send data to rabbitMQ
      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      // plugin will fetch data from rabbit, process it and will emit 'adddevice' to plugin
      // our app.js (child process) will send system message to parent process (this file)
      // once 'adddevice' has been processed

      _app.on('message', (msg) => {
        if (msg.done === true && msg.method === 'POST') { done() }
      })
    })
  })

  describe('#updatedevice', function () {
    it('should update the device', function (done) {
      this.timeout(10000)

      let dummyData = {
        operation: 'updatedevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`,
          attributes: [
            { key: 'SerialNumber', value: 'xxx' },
            { key: 'IPv4', value: 'xxx' }
          ]
        }
      }

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      _app.on('message', (msg) => {
        if (msg.done === true && msg.method === 'PATCH') {
          done()
        }
      })
    })
  })

  describe('#removedevice', function () {
    it('should remove the device', function (done) {
      this.timeout(10000)

      let dummyData = {
        operation: 'removedevice',
        device: {
          _id: dummyId,
          name: `dummy${dummyId}`
        }}

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      _app.on('message', (msg) => {
        if (msg.done === true && msg.method === 'DELETE') {
          done()
        }
      })
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      _app.on('message', (msg) => {
        if (msg.done === true && msg.method === 'GET') { done() }
      })
    })
  })
})
