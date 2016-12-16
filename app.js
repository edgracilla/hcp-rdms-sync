'use strict';

var platform        = require('./platform'),
	isArray         = require('lodash.isarray'),
	isPlainObject   = require('lodash.isplainobject'),
	requestPromise  = require('request-promise'),
	async           = require('async'),
	_config;

// used in mocha test notif
let _notifyDone = (method) => {
	process.send({ done: true, method: method });
};

let _processRequest = (action, device, callback) => {

	let params = {};
	let logTitle = '';
	let apiUrl = `https://${_config.host}/com.sap.iotservices.dms/v2/api/devices`;

	if (!isPlainObject(device))
		return platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${device}`));

	switch (action) {

		case 'sync':
			params.method = 'GET';
			params.url = apiUrl;
			break;

		case 'update':
			params.method = 'PATCH';
			params.url = `${apiUrl}/${device._id}/attributes`;
			logTitle = `Device '${device._id}' updated in SAP HCP.`;

			params.body = device.attributes;
			break;

		case 'remove':
			params.method = 'DELETE';
			params.url = `${apiUrl}/${device._id}`;
			logTitle = `Device '${device._id}' removed in SAP HCP.`;
			break;

		case 'add':
			params.method = 'POST';
			params.url = apiUrl;
			logTitle = `Device '${device.name}' added in SAP HCP.`;

			params.body = {
				id: device._id,
				name: device.name,
				deviceType: _config.device_type,
				attributes: device.attributes
			};

			break;
	}

	params.json = true;
	params.auth = { user: _config.username, pass: _config.password };

	requestPromise(params)
		.then((object) => {
			
			if (action === 'sync')
				return callback(object);
			
			_notifyDone(params.method);
			platform.log(JSON.stringify({
				title: logTitle,
				data: object
			}));

		})
		.catch((error) => {
			_notifyDone(params.method);
			platform.handleException(error);
		});
};

platform.on('sync', function (lastSyncDate) {
	
	_processRequest('sync', {}, (devices) => {

		if (!isArray(devices))
			return platform.handleException(new Error(`Invalid data received. Data must be a valid Array/JSON Object or a collection of objects. Data: ${devices}`));

		async.each(devices, (device, done) => {
			let param = {
				_id: device.id,
				name: device.name,
				metadata: device.attributes ? { sap: { attributes: device.attributes }} : { /*empty*/ }
			};

			platform.syncDevice(JSON.stringify(param), done);

		}, () => {
			_notifyDone('GET'); 
		});
	});

});

platform.on('adddevice', function (device) {
	_processRequest('add', device);
});

platform.on('updatedevice', function (device) {
	_processRequest('update', device);
});

platform.on('removedevice', function (device) {
	_processRequest('remove', device);
});

platform.once('close', function () {
	platform.notifyClose();
});

platform.once('ready', function (options) {
	_config = options;

	platform.notifyReady();
	platform.log('HCP-RDMS Device sync has been initialized.');
});