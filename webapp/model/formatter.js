sap.ui.define([], function() {
    "use strict";
    return {
        
        /**
         * Format Date object to a string in the format d.M.yyyy.
         * @param {Date} vDate - Date object to format
         * @returns {string} - Das formatierte Datum im Format d.M.yyyy
         */
        formatDate: function (vDate) {
            if (!vDate) {
                return "";
            }
            
            const oDate = typeof vDate === "string" ? new Date(vDate) : vDate;
            
            if(oDate instanceof Date === false) {
                return vDate;
            }
            if (isNaN(oDate.getTime())) {
                return vDate; // Return original value if it's not a valid date
            }
            return vDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        },
        
        /**
         * Format the status text for upload entries.
         * @param {string} sStatus - The status in CHAR1 like "P", "S" etc.
         * @returns {string} - The formatted status text
         */
        formatStatusText: function(sStatus) {
            var oBundle = this.getView().getModel("i18n").getResourceBundle();
            switch (sStatus) {
                case "P": return oBundle.getText("status.sap.information");
                case "S": return oBundle.getText("status.sap.success");
                case "E": return oBundle.getText("status.sap.error");
                case "C": return oBundle.getText("status.sap.critical");
                case "W": return oBundle.getText("status.sap.warning");
                case "I": return oBundle.getText("status.sap.information");
                default:  return oBundle.getText("status.sap.unknown");
            }
        },
        
        /**
         * This function maps the CHAR1 status codes to UI5 state colors.
         * @param {string} sStatus - The status in CHAR1 like "P", "S" etc.
         * @returns {string} - The UI5 state color for the status like "None", "Success" etc.
         */
        formatStatusState: function(sStatus) {
            switch (sStatus) {
                case "P": return "None";
                case "S": return "Success";
                case "E": return "Error";
                case "C": return "Error";
                case "W": return "Warning";
                case "I": return "Information";
                default:  return "None";
            }
        },
        
        /**
         * Format the status to an icon path for timesheet entries.
         * @param {string} sStatus - The status in CHAR1 like "P", "S" etc.
         * @returns {string} - The icon path for the status
         */
        formatStatusIcon: function(sStatus) {
            switch (sStatus) {
                case "P": return "sap-icon://pending";
                case "S": return "sap-icon://status-positive";
                case "E": return "sap-icon://status-error";
                case "C": return "sap-icon://status-critical";
                case "W": return "sap-icon://warning";
                case "I": return "sap-icon://information";
                default:  return "sap-icon://question-mark";
            }
        }        
        
    };
});
