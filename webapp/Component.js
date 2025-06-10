sap.ui.requireSync("at/zeta/ppm/scheduleupload/util/loaderConfig");

sap.ui.define([
    "sap/ui/core/UIComponent",
    "at/zeta/ppm/scheduleupload/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("at.zeta.ppm.scheduleupload.Component", {
        metadata: {
            manifest: "json",
            config: { fullWidth: true },
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();
        }
    });
});