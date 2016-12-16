'use strict';

var platform 			= require('./platform'),
	isArray 				= require('lodash.isarray'),
	isPlainObject 	= require('lodash.isplainobject'),
	requestPromise 	= require('request-promise'),
	async						= require('async'),
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

/**
 * Emitted when the platform issues a sync request. Means that the device sync plugin
 * should fetch updates from the 3rd party service.
 * @param {string} lastSyncDate ISO Timestamp from when the last sync happened. Allows you to fetch data from a certain point in time.
 */
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

		}, () => { _notifyDone('GET'); });
	});

});

/**
 * Emitted when a device is registered in the Reekoh platform.
 * @param {object} device The Device details and/or information.
 */
platform.on('adddevice', function (device) {

	_processRequest('add', device);

});

/**
 * Emitted when a device is update in the Reekoh platform.
 * @param {object} device The Device details and/or information.
 */
platform.on('updatedevice', function (device) {

	_processRequest('update', device);

});

/**
 * Emitted when a device is deleted in the Reekoh platform.
 * @param {object} device The Device details and/or information.
 */
platform.on('removedevice', function (device) {

	_processRequest('remove', device);

});

/**
 * Emitted when the platform shuts down the plugin. The Device Sync should perform cleanup of the resources on this event.
 */
platform.once('close', function () {
	let d = require('domain').create();

	d.once('error', function (error) {
		console.error(error);
		platform.handleException(error);
		platform.notifyClose();
		d.exit();
	});

	d.run(function () {
		// TODO: Release all resources and close connections etc.
		platform.notifyClose(); // Notify the platform that resources have been released.
		d.exit();
	});
});

/**
 * Emitted when the platform bootstraps the plugin. The plugin should listen once and execute its init process.
 * Afterwards, platform.notifyReady() should be called to notify the platform that the init process is done.
 * @param {object} options The parameters or options. Specified through config.json.
 */
platform.once('ready', function (options) {
	_config = options;

	platform.notifyReady();
	platform.log('Device sync has been initialized.');
});