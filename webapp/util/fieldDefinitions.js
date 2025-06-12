sap.ui.define([
    "sap/ui/export/library",
    "sap/ui/model/json/JSONModel"
], function (exportLibrary, JSONModel) {
    "use strict";
    /**
     * @namespace at.zeta.ppm.scheduleupload.util.fieldDefinitions
     * @description Enthält Definitionen für die Felder in der schedule-Upload-Tabelle.
     * @since 1.0.0
     */



    /**
     * Enum für die Felder in der schedule-Upload-Tabelle.
     * @enum {string}
     * @readonly
     * @example

     */
    const ScheduleFields = Object.freeze({
        PROJECT_ID: "projectId",
        WBS_ID: "wbsId",
        PLANNED_START_DATE: "plannedStartDate",
        PLANNED_END_DATE: "plannedEndDate",
        BASELINE_START_DATE: "baselineStartDate",
        BASELINE_END_DATE: "baselineEndDate",
        MILESTONE: "milestone",
        STATUS: "status",
        STATUS_MESSAGE: "statusMessage",
        DESCRIPTION: "description",



    });

    /**
     * EDM Type Definitionen für die schedule-Felder.
     * @enum {sap.ui.core.format.EdmType}
     * @readonly
     * @example
    
     */
    const EdmType = exportLibrary.EdmType;

    return {
        ScheduleFields,
        EdmType,
        JSONModel,

        /**
         * Gibt die Spaltenüberschriften für die schedule-Tabellen zurück.
         * @returns {Array} Array von Objekten mit key und propertyKey
         */
        // getMandatoryScheduleFields: function () {
        //     return [
        //         ScheduleFields.PROJECT_ID,
        //         ScheduleFields.WBS_ID,


        //     ];
        // },

        getTemplateColumnConfig: function () {
            return [

                {
                    property: "projectId",
                    type: EdmType.String,
                    template: {
                        content: "{projectId}"
                    },
                    width: 20
                },

                {
                    property: "wbsId",
                    type: EdmType.String,
                    template: {
                        content: "{wbsId}"
                    },
                    width: 25
                },

                {
                    property: "plannedStartDate",
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    template: {
                        content: "{plannedStartDate}",
                        format: "dd.MM.yyyy"

                    },
                    width: 15
                },

                {
                    property: "plannedEndDate",
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    template: {
                        content: "{plannedEndDate}",
                        format: "dd.MM.yyyy"
                    },
                    width: 15
                },

                {
                    property: "baselineStartDate",
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    template: {
                        content: "{baselineStartDate}",
                        format: "dd.MM.yyyy"
                    },
                    width: 15
                },

                {
                    property: "baselineEndDate",
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    template: {
                        content: "{baselineEndDate}",
                        format: "dd.MM.yyyy"

                    },
                    width: 15

                },
                {
                    property: "milestone",
                    type: EdmType.String,
                    template: {
                        content: "{milestone}"
                    },
                    width: 10

                },

                {
                    property: "description",
                    type: EdmType.String,
                    template: {
                        content: "{description}"
                    },
                    width: 40

                },


            ];
        },

        getTemplateExampleRow: function (i18n) {


            return {
                [ScheduleFields.PROJECT_ID]: i18n.getText("template.column.example." + ScheduleFields.PROJECT_ID),
                [ScheduleFields.WBS_ID]: i18n.getText("template.column.example." + ScheduleFields.WBS_ID),
                [ScheduleFields.PLANNED_START_DATE]: i18n.getText("template.column.example." + ScheduleFields.PLANNED_START_DATE),
                [ScheduleFields.PLANNED_END_DATE]: i18n.getText("template.column.example." + ScheduleFields.PLANNED_END_DATE),
                [ScheduleFields.BASELINE_START_DATE]: i18n.getText("template.column.example." + ScheduleFields.BASELINE_START_DATE),
                [ScheduleFields.BASELINE_END_DATE]: i18n.getText("template.column.example." + ScheduleFields.BASELINE_END_DATE),
                [ScheduleFields.MILESTONE]: i18n.getText("template.column.example." + ScheduleFields.MILESTONE),
                [ScheduleFields.DESCRIPTION]: i18n.getText("template.column.example." + ScheduleFields.DESCRIPTION),

            };
        }

    };
});







