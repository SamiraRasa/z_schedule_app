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

                    ScheduleFields.PROJECT_ID,
                    ScheduleFields.MILESTONE,
                    ScheduleFields.MILESTONE_NAME,
                    ScheduleFields.PLANNED_END_DATE,

                ];
            } else {
                return [

                    ScheduleFields.WBS_ID,
                    ScheduleFields.PLANNED_START_DATE,
                    ScheduleFields.PLANNED_END_DATE,
                    
                ];
            }
        },

        getTemplateColumnConfig: function (i18n) {
            return [
                {
                    label: i18n.getText("table.header." + ScheduleFields.PROJECT_ID),
                    property: ScheduleFields.PROJECT_ID,
                    type: EdmType.String,
                    width: 20
                },


                {
                    label: i18n.getText("table.header." + ScheduleFields.WBS_ID),
                    property: ScheduleFields.WBS_ID,
                    type: EdmType.String,
                    width: 25
                },

                {
                    label: i18n.getText("table.header." + ScheduleFields.PLANNED_START_DATE),
                    property: ScheduleFields.PLANNED_START_DATE,
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    width: 15
                },

                {
                    label: i18n.getText("table.header." + ScheduleFields.PLANNED_END_DATE),
                    property: ScheduleFields.PLANNED_END_DATE,
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    width: 15
                },

                {
                    label: i18n.getText("table.header." + ScheduleFields.BASELINE_START_DATE),
                    property: ScheduleFields.BASELINE_START_DATE,
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    width: 15
                },

                {
                    label: i18n.getText("table.header." + ScheduleFields.BASELINE_END_DATE),
                    property: ScheduleFields.BASELINE_END_DATE,
                    type: EdmType.Date,
                    inputFormat: "dd.MM.yyyy",
                    width: 15

                },
                {
                    label: i18n.getText("table.header." + ScheduleFields.POC),
                    property: ScheduleFields.POC,
                    type: EdmType.Number,
                    inputFormat: "0.00",
                    scale: 2,
                    width: 5
                },
                {
                    label: i18n.getText("table.header." + ScheduleFields.MILESTONE),
                    property: ScheduleFields.MILESTONE,
                    type: EdmType.String,
                    width: 10
                },
                {

                    label: i18n.getText("table.header." + ScheduleFields.MILESTONE_NAME),
                    property: ScheduleFields.MILESTONE_NAME,
                    type: EdmType.String,
                    width: 40
                },

                {
                    label: i18n.getText("table.header." + ScheduleFields.DESCRIPTION),
                    property: ScheduleFields.DESCRIPTION,
                    type: EdmType.String,
                    width: 40
                }

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
                [ScheduleFields.POC]: i18n.getText("template.column.example." + ScheduleFields.POC),
                [ScheduleFields.MILESTONE]: i18n.getText("template.column.example." + ScheduleFields.MILESTONE),
                [ScheduleFields.MILESTONE_NAME]: i18n.getText("template.column.example." + ScheduleFields.MILESTONE_NAME),
                [ScheduleFields.DESCRIPTION]: i18n.getText("template.column.example." + ScheduleFields.DESCRIPTION),

            };
        }

    };
});







