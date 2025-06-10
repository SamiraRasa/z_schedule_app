sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "at/zeta/ppm/scheduleupload/model/formatter"
], function (Controller, History, Formatter) {
    "use strict";

    return Controller.extend("at.zeta.ppm.scheduleupload.controller.BaseController", {
        formatter: Formatter,
        
        /**
         * Navigiert zurück, oder wenn keine History vorhanden ist, zur definierten Route.
         * @param {string} [sFallbackRoute="RouteAuslieferungen"]
         */
        // navBackOrHome: function (sFallbackRoute = "Main") {
        //     const oHistory = History.getInstance();
        //     const sPreviousHash = oHistory.getPreviousHash();

        //     if (sPreviousHash !== undefined) {
        //         window.history.go(-1);
        //     } else {
        //         this.getRouter().navTo(sFallbackRoute, {}, undefined, true);
        //     }
        // },

        /**
         * Gibt den Router der aktuellen Komponente zurück.
         * @returns {sap.ui.core.routing.Router} Router-Instanz
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Gibt ein an die View gebundenes Model zurück.
         * Wenn kein Name angegeben ist, wird das Default-Model der View zurückgegeben.
         * 
         * @param {string} [sName] - Der Name des View-Models (optional)
         * @returns {sap.ui.model.Model} - Die Model-Instanz der View
         */
        getViewModel: function (sName) {
            return this.getView().getModel(sName);
        },

        /**
         * Gibt ein an die Komponente gebundenes (globales) Model zurück.
         * Wenn kein Name angegeben ist, wird das Default-Model der Komponente zurückgegeben.
         * 
         * @param {string} [sName] - Der Name des globalen Models (optional)
         * @returns {sap.ui.model.Model} - Die Model-Instanz der Komponente
         */
        getModel: function (sName) {
            return this.getOwnerComponent().getModel(sName);
        },

        /**
         * Setzt ein Model auf die aktuelle View.
         * @param {sap.ui.model.Model} oModel - Die Model-Instanz
         * @param {string} [sName] - Der Name des Models
         */
        setViewModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Gibt das ResourceBundle für i18n zurück.
         * @returns {sap.ui.model.resource.ResourceBundle} - Das ResourceBundle-Objekt
         */
        i18n: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        }

        

    });
});