/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"at/zeta/ppm/scheduleupload/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
