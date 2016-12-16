
'use strict';

var cp   = require('child_process'),
	assert = require('assert'),
	deviceSync;

describe('Device Sync', function () {
  this.slow(5000);

  let dummy_id = `${Date.now() + 1}`;

  after('terminate child process', function () {
    deviceSync.kill('SIGKILL');
  });

  describe('#spawn', function () {
    it('should spawn a child process', function () {
      assert.ok(deviceSync = cp.fork(process.cwd()), 'Child process not spawned.');
    });
  });

  describe('#handShake', function () {
    it('should notify the parent process when ready within 5 seconds', function (done) {
      this.timeout(5000);

      deviceSync.on('message', function (message) {
        if (message.type === 'ready')
          done();
      });

      deviceSync.send({
        type: 'ready',
        data: {
          options: {
            host: 'iotrdmsiotservices-p1942340584trial.hanatrial.ondemand.com',
            username: 'adinglasan@reekoh.com',
            password: 'Feb?0593',
            device_type: '098c95c948ab5b113d21'
          }
        }
      }, function (error) {
        assert.ifError(error);
      });
    });
  });

  describe('#adddevice', function () {
    it('should add the device', function (done) {
      this.timeout(10000);

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'POST') 
          done();
      });

      deviceSync.send({
        type: 'adddevice',
        data: {
          _id: dummy_id,
          name: `dummy${dummy_id}`,
          attributes: [
            {
              key: 'SerialNumber',
              value: 'SN 5121982812'
            },
            {
              key: 'IPv4',
              value: '127.0.0.1'
            }
          ]
        }
      });

    });
  });

  describe('#updatedevice', function () {
    it('should update the device', function (done) {
      this.timeout(10000);

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'PATCH') 
          done();
      });

      deviceSync.send({
        type: 'updatedevice',
        data: {
          _id: dummy_id,
        
          attributes: [
            {
              key: 'SerialNumber',
              value: 'xxx'
            },
            {
              key: 'IPv4',
              value: 'xxx'
            }
          ]
        }
      });

    });
  });

  describe('#removedevice', function () {
    it('should remove the device', function (done) {
      this.timeout(10000);

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'DELETE') 
          done();
      });

      deviceSync.send({
        type: 'removedevice',
        data: {
          _id: dummy_id
        }
      });

    });
  });

  describe('#sync', function () {
    it('should execute device sync', function (done) {
      this.timeout(10000);

      deviceSync.on('message', (msg) => {
        if (msg.done === true && msg.method === 'GET') 
          done();
      });

      deviceSync.send({
        type: 'sync',
        data: {
          last_sync_dt: (new Date())
        }
      });

    });
  });

});