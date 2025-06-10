sap.ui.define([
    "at/zeta/ppm/scheduleupload/controller/BaseController",
    "at/zeta/ppm/scheduleupload/util/fieldDefinitions",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "xlsx"
], (BaseController, FieldDefinitions, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, Spreadsheet, XLSX) => {
    "use strict";

    return BaseController.extend("at.zeta.ppm.scheduleupload.controller.Main", {
        TsFields: FieldDefinitions.ScheduleFields,

        onInit() {
            this._reset();



        },
        _reset: function () {
            this.setViewModel(new sap.ui.model.json.JSONModel({
                fileName: null,
                filePath: null,
                uploadStatus: "",
                uploadStatusMessage: this.i18n().getText("status.noFileSelected"),
                busy: false,
                scheduleData: [],

            }));
        },
        _setBusy: function (bBusy) {
            const oViewModel = this.getViewModel();


            if (!bBusy) {
                setTimeout(() => {
                    oViewModel.setProperty("/busy", false);
                }, 1000);
            } else {
                oViewModel.setProperty("/busy", true);
            }
        },


        onExcelTemplateFileExport: function () {
            const aColumnConfig = FieldDefinitions.getTemplateColumnConfig();
            const aExampleRow = FieldDefinitions.getTemplateExampleRow(this.i18n());

            const oSettings = {
                workbook: { columns: aColumnConfig },
                dataSource: [aExampleRow],
                fileName: "Schedul_Empty_Template.xlsx",
                worker: false
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });
        },



        handleTypeMissmatch: function (oEvent) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const aFileTypes = oEvent.getSource().getFileType();
            const sWrongType = oEvent.getParameter("fileType");
            const sSupportedTypes = aFileTypes.map(t => "*." + t).join(", ");

            sap.m.MessageBox.error(
                oResourceBundle.getText("msg.invalidFileType", [sWrongType]),
                {
                    title: oResourceBundle.getText("msg.invalidFileType.title"),
                    details: oResourceBundle.getText("msg.invalidFileType.details", [sSupportedTypes]),
                    styleClass: "sapUiResponsivePadding--header sapUiResponsivePadding--content sapUiResponsivePadding--footer"
                }
            );
        },



        onFileChange: async function (oEvent) {
            this._reset();
            const oViewModel = this.getViewModel();
            this._setBusy(true);
            oViewModel.setProperty("/uploadStatus", "P");
            oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadInProgress"));

            // Retrieve file from event and check preconditions
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            if (!oFile || !window.FileReader) {
                this._setBusy(false);
                MessageBox.error(this.i18n().getText("error.fileApiNotSupported"));
                return;
            }
            const sExtension = oFile.name.split('.').pop().toLowerCase();
            if (sExtension !== "xlsx") {
                this._setBusy(false);
                MessageToast.show(this.i18n().getText("message.wrongFileFormat"));
                oViewModel.setProperty("/uploadStatus", "W");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.wrongFileFormat"));
                return;
            }

            try {
                const data = await new Promise((resolve, reject) => {
                    debugger;
                    const reader = new FileReader();
                    reader.onload = evt => resolve(evt.target.result);
                    reader.onerror = evt => reject(evt.target.error || new Error("File read error"));
                    reader.readAsArrayBuffer(oFile);
                });

                // Parse Excel workbook(s)
                const workbook = XLSX.read(data, { type: "binary" });
                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];

                });

                MessageToast.show("The file is valid! Next step: reading the file...");
            } catch (error) {
                const sErrorMsg = error instanceof Error ? error.message : String(error);
                MessageBox.error(sErrorMsg);
                oViewModel.setProperty("/uploadStatus", "E");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadingFailed"));
            } finally {
                this._setBusy(false);
                const oFileUploader = this.byId("fileUploader");
                oFileUploader.setValueState("None");
                oFileUploader.setValueStateText("");
                oFileUploader.setValue("");
            }
        }



    });


});