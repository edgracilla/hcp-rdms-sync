/* global describe, it, after, before */
'use strict'

const cp = require('child_process')
const should = require('should')

const amqp = require('amqplib')

let deviceSync = null
let _channel = {}
let _conn = null

describe('Device Sync', function () {
  // let dummyId = `${Date.now() + 1}`

  before('init', () => {
    process.env.PLUGIN_ID = 'demo.dev-sync'
    process.env.BROKER = 'amqp://guest:guest@127.0.0.1/'

    process.env.HCP_RDMS_HOST = 'iotrdmsiotservices-p1942340584trial.hanatrial.ondemand.com'
    process.env.HCP_RDMS_USERNAME = 'adinglasan@reekoh.com'
    process.env.HCP_RDMS_PASSWORD = 'Feb?0593'
    process.env.HCP_RDMS_DEVICE_TYPE = '098c95c948ab5b113d21'

    amqp.connect(process.env.BROKER)
      .then((conn) => {
        _conn = conn
        return conn.createChannel()
      }).then((channel) => {
        _channel = channel
      }).catch((err) => {
        console.log(err)
      })
  })

  after('terminate child process', function () {
    this.timeout(5000)

    setTimeout(() => {
      _conn.close()
      deviceSync.kill('SIGKILL')
    }, 4500)
  })

  describe('#spawn', () => {
    it('should spawn a child process', () => {
      should.ok(deviceSync = cp.fork(process.cwd()), 'Child process not spawned.')
    })
  })

  describe('#handShake', () => {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000)

      deviceSync.on('message', function (message) {
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
      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      // plugin will fetch data from rabbit, process it and will emit 'adddevice' to plugin
      // our app.js (child process) will send system message to parent process (this file)
      // once 'adddevice' has been processed

      deviceSync.on('message', (msg) => {
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
        }}

      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      deviceSync.on('message', (msg) => {
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

      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify(dummyData)))

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'DELETE') {
          done()
        }
      })
    })
  })

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000)

      _channel.sendToQueue(process.env.PLUGIN_ID, new Buffer(JSON.stringify({ operation: 'sync' })))

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'GET') { done() }
      })
    })
  })
})
