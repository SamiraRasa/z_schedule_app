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
        POC: "poc",
        MILESTONE: "milestone",
        WBS_MILESTONE_NAME: "milestoneName",
        STATUS: "status",
        STATUS_MESSAGE: "statusMessage",
        DESCRIPTION: "description"
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

        getFieldOrder: function (bIsPoC = false) {
            switch (true) {
                case bIsPoC:
                    return [
                        ScheduleFields.PROJECT_ID,
                        ScheduleFields.WBS_ID,
                        ScheduleFields.POC,
                        ScheduleFields.DESCRIPTION
                    ];
                default:
                    return [
                        ScheduleFields.PROJECT_ID,
                        ScheduleFields.WBS_ID,
                        ScheduleFields.PLANNED_START_DATE,
                        ScheduleFields.PLANNED_END_DATE,
                        ScheduleFields.BASELINE_START_DATE,
                        ScheduleFields.BASELINE_END_DATE,
                        ScheduleFields.MILESTONE,
                        ScheduleFields.WBS_MILESTONE_NAME,
                        ScheduleFields.DESCRIPTION
                    ];
            }
        },

        getDateFields: function () {
            return [
                ScheduleFields.PLANNED_START_DATE,
                ScheduleFields.PLANNED_END_DATE,
                ScheduleFields.BASELINE_START_DATE,
                ScheduleFields.BASELINE_END_DATE,
            ];
        },

        getMandatoryFields: function (bIsMilestone, bIsPoC) {
            switch (true) {
                case bIsPoC:
                    return [
                        ScheduleFields.PROJECT_ID,
                        ScheduleFields.WBS_ID,
                        // ScheduleFields.POC
                    ];
                case bIsMilestone:
                    return [
                        ScheduleFields.PROJECT_ID,
                        // ScheduleFields.MILESTONE,
                        ScheduleFields.WBS_MILESTONE_NAME,
                        ScheduleFields.PLANNED_END_DATE
                    ];
                default:
                    return [
                        ScheduleFields.PROJECT_ID,
                        ScheduleFields.WBS_ID,
                        ScheduleFields.PLANNED_START_DATE,
                        ScheduleFields.PLANNED_END_DATE
                    ];
            }
        },

        /**
         * Gibt die Spaltenüberschriften für die schedule-Tabellen zurück.
         * @returns {Array} Array von Objekten mit key und propertyKey
         */
        _buildTemplateColumn: function (field, mandatoryFields, i18n, width) {
            return {
                label: i18n.getText("table.header." + field) + (mandatoryFields.includes(field) ? " *" : ""),
                key: field,
                width: width
            };
        },

        getScheduleTemplateColumnConfig: function (i18n) {
            const mandatoryFields = this.getMandatoryFields(false);
            const f = (field, width) => this._buildTemplateColumn(field, mandatoryFields, i18n, width);
            return [
                f(ScheduleFields.PROJECT_ID, 15),
                f(ScheduleFields.WBS_ID, 18),
                f(ScheduleFields.PLANNED_START_DATE, 18),
                f(ScheduleFields.PLANNED_END_DATE, 18),
                f(ScheduleFields.BASELINE_START_DATE, 18),
                f(ScheduleFields.BASELINE_END_DATE, 18),
                f(ScheduleFields.MILESTONE, 15),
                f(ScheduleFields.WBS_MILESTONE_NAME, 20),
                f(ScheduleFields.DESCRIPTION, 25)
            ];
        },

        getPocTemplateColumnConfig: function (i18n) {
            const mandatoryFields = this.getMandatoryFields(false, true);
            const f = (field, width) => this._buildTemplateColumn(field, mandatoryFields, i18n, width);
            return [
                f(ScheduleFields.PROJECT_ID, 15),
                f(ScheduleFields.WBS_ID, 18),
                f(ScheduleFields.POC, 15),
                f(ScheduleFields.DESCRIPTION, 25)
            ];
        },



        getScheduleTemplateExampleRow: function (i18n) {
            // getTemplateExampleRow: function (i18n) {
            return [
                i18n.getText("template.column.example." + ScheduleFields.PROJECT_ID),
                i18n.getText("template.column.example." + ScheduleFields.WBS_ID),
                i18n.getText("template.column.example." + ScheduleFields.PLANNED_START_DATE),
                i18n.getText("template.column.example." + ScheduleFields.PLANNED_END_DATE),
                i18n.getText("template.column.example." + ScheduleFields.BASELINE_START_DATE),
                i18n.getText("template.column.example." + ScheduleFields.BASELINE_END_DATE),
                i18n.getText("template.column.example." + ScheduleFields.MILESTONE),
                i18n.getText("template.column.example." + ScheduleFields.WBS_MILESTONE_NAME),
                i18n.getText("template.column.example." + ScheduleFields.DESCRIPTION)
            ];
        },
        getPocTemplateExampleRow: function (i18n) {
            return [
                i18n.getText("template.column.example." + ScheduleFields.PROJECT_ID),
                i18n.getText("template.column.example." + ScheduleFields.WBS_ID),
                i18n.getText("template.column.example." + ScheduleFields.POC),
                i18n.getText("template.column.example." + ScheduleFields.DESCRIPTION),
            ];

        },

    };
});


