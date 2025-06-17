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
        
        WBS_ID: "wbsId",
        PLANNED_START_DATE: "plannedStartDate",
        PLANNED_END_DATE: "plannedEndDate",
        BASELINE_START_DATE: "baselineStartDate",
        BASELINE_END_DATE: "baselineEndDate",
        POC: "percentageOfCompletion",
        MILESTONE: "milestone",
        MILESTONE_NAME: "milestoneName",
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

        getMandatoryFields: function (bIsMilestone) {
            if (bIsMilestone) {

                return [

                    ScheduleFields.WBS_ID,
                    ScheduleFields.MILESTONE,
                    ScheduleFields.MILESTONE_NAME,
                    ScheduleFields.PLANNED_END_DATE,

                ];
            } else {
                return [
                   
                    ScheduleFields.WBS_ID,
                    ScheduleFields.PLANNED_START_DATE,
                    ScheduleFields.PLANNED_END_DATE,
                    ScheduleFields.BASELINE_START_DATE,
                    ScheduleFields.BASELINE_END_DATE
                ];
            }
        },

        getTemplateColumnConfig: function () {
            return [

              
                {
                    property: "wbsId", // TODO: Change the enum
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
                    property: ScheduleFields.POC,
                    type: EdmType.Number,
                    inputFormat: "0.00",
                    scale: 2,
                    template: {
                        content: "{percentageOfCompletion}"
                    },
                    width: 5
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

                    property: "milestoneName",

                    type: EdmType.String,

                    template: {

                        content: "{milestoneName}"

                    },

                    width: 40

                },

                {
                    property: "description",
                    type: EdmType.String,
                    template: {
                        content: "{description}"
                    },
                    width: 40

                }

            ];
        },

        getTemplateExampleRow: function (i18n) {


            return {
               
                [ScheduleFields.WBS_ID]: i18n.getText("template.column.example." + ScheduleFields.WBS_ID),
                [ScheduleFields.PLANNED_START_DATE]: i18n.getText("template.column.example." + ScheduleFields.PLANNED_START_DATE),
                [ScheduleFields.PLANNED_END_DATE]: i18n.getText("template.column.example." + ScheduleFields.PLANNED_END_DATE),
                [ScheduleFields.BASELINE_START_DATE]: i18n.getText("template.column.example." + ScheduleFields.BASELINE_START_DATE),
                [ScheduleFields.BASELINE_END_DATE]: i18n.getText("template.column.example." + ScheduleFields.BASELINE_END_DATE),
                [ScheduleFields.POC]: i18n.getText("template.column.example." + ScheduleFields.POC),
                [ScheduleFields.MILESTONE]: i18n.getText("template.column.example." + ScheduleFields.MILESTONE),
                [ScheduleFields.MILESTONE_NAME]: i18n.getText("template.column.example." + ScheduleFields.MILESTONE_NAME),
                [ScheduleFields.DESCRIPTION]: i18n.getText("template.column.example." + ScheduleFields.DESCRIPTION),

            };
        }

    };
});







