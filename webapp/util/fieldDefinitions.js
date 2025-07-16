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


        getMandatoryFields: function (bIsMilestone, isPoC) {
            if (isPoC) {
                return [ScheduleFields.PROJECT_ID, ScheduleFields.WBS_ID, ScheduleFields.POC];
            } else if (bIsMilestone) {
                return [ScheduleFields.PROJECT_ID, ScheduleFields.MILESTONE, ScheduleFields.MILESTONE_NAME, ScheduleFields.PLANNED_END_DATE];
            } else {
                return [ScheduleFields.PROJECT_ID, ScheduleFields.WBS_ID, ScheduleFields.PLANNED_START_DATE, ScheduleFields.PLANNED_END_DATE];
            }
        },

        getScheduleTemplateColumnConfig: function (i18n) {
            const mandatoryFields = this.getMandatoryFields(false);
            return [
                { label: mandatoryFields.includes(ScheduleFields.PROJECT_ID) ? i18n.getText("table.header." + ScheduleFields.PROJECT_ID) + " *" : i18n.getText("table.header." + ScheduleFields.PROJECT_ID), key: ScheduleFields.PROJECT_ID, width: 15 },
                { label: mandatoryFields.includes(ScheduleFields.WBS_ID) ? i18n.getText("table.header." + ScheduleFields.WBS_ID) + " *" : i18n.getText("table.header." + ScheduleFields.WBS_ID), key: ScheduleFields.WBS_ID, width: 18 },
                { label: mandatoryFields.includes(ScheduleFields.PLANNED_START_DATE) ? i18n.getText("table.header." + ScheduleFields.PLANNED_START_DATE) + " *" : i18n.getText("table.header." + ScheduleFields.PLANNED_START_DATE), key: ScheduleFields.PLANNED_START_DATE, width: 18 },
                { label: mandatoryFields.includes(ScheduleFields.PLANNED_END_DATE) ? i18n.getText("table.header." + ScheduleFields.PLANNED_END_DATE) + " *" : i18n.getText("table.header." + ScheduleFields.PLANNED_END_DATE), key: ScheduleFields.PLANNED_END_DATE, width: 18 },
                { label: i18n.getText("table.header." + ScheduleFields.BASELINE_START_DATE), key: ScheduleFields.BASELINE_START_DATE, width: 18 },
                { label: i18n.getText("table.header." + ScheduleFields.BASELINE_END_DATE), key: ScheduleFields.BASELINE_END_DATE, width: 18 },
                { label: i18n.getText("table.header." + ScheduleFields.MILESTONE) + " *" , key: ScheduleFields.MILESTONE, width: 15 },
                { label: i18n.getText("table.header." + ScheduleFields.MILESTONE_NAME) + " *" , key: ScheduleFields.MILESTONE_NAME, width: 20 },
                { label: i18n.getText("table.header." + ScheduleFields.DESCRIPTION), key: ScheduleFields.DESCRIPTION, width: 25 }
            ];
        },

        getPocTemplateColumnConfig: function (i18n) {
            const mandatoryFields = this.getMandatoryFields(false, true);
            return [
                { label: mandatoryFields.includes(ScheduleFields.PROJECT_ID) ? i18n.getText("table.header." + ScheduleFields.PROJECT_ID) + " *" : i18n.getText("table.header." + ScheduleFields.PROJECT_ID), key: ScheduleFields.PROJECT_ID, width: 15 },
                { label: mandatoryFields.includes(ScheduleFields.WBS_ID) ? i18n.getText("table.header." + ScheduleFields.WBS_ID) + " *" : i18n.getText("table.header." + ScheduleFields.WBS_ID), key: ScheduleFields.WBS_ID, width: 18 },
                { label: mandatoryFields.includes(ScheduleFields.POC) ? i18n.getText("table.header." + ScheduleFields.POC) + " *" : i18n.getText("table.header." + ScheduleFields.POC), key: ScheduleFields.POC, width: 15 },
                { label: i18n.getText("table.header." + ScheduleFields.DESCRIPTION), key: ScheduleFields.DESCRIPTION, width: 25 }
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
                i18n.getText("template.column.example." + ScheduleFields.MILESTONE_NAME),
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


