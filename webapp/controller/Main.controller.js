sap.ui.define([
    "at/zeta/ppm/scheduleupload/controller/BaseController",
    "at/zeta/ppm/scheduleupload/util/fieldDefinitions",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/core/message/MessageManager",
    "xlsx"
], (BaseController, FieldDefinitions, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, Spreadsheet, MessagePopover, MessageItem, MessageManager, XLSX) => {
    "use strict";

    return BaseController.extend("at.zeta.ppm.scheduleupload.controller.Main", {
        TsFields: FieldDefinitions.ScheduleFields,

        // === Initialisierung ===
        onInit() {
            this._reset();

        },

        // === Excel Template Export ===
        onExcelTemplateFileExport: function () {
            const aColumnConfig = FieldDefinitions.getTemplateColumnConfig();
            const aExampleRow = FieldDefinitions.getTemplateExampleRow(this.i18n());

            const oSettings = {
                workbook: { columns: aColumnConfig },
                dataSource: [aExampleRow],
                fileName: "Schedule_Empty_Template.xlsx",
                worker: false
            };

            const oSheet = new Spreadsheet(oSettings);
            oSheet.build().finally(function () {
                oSheet.destroy();
            });

        },

        // === File Type Fehlerbehandlung ===
        handleTypeMissmatch: function (oEvent) {
            const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            const aFileTypes = oEvent.getSource().getFileType();
            const sWrongType = oEvent.getParameter("fileType");
            const sSupportedTypes = aFileTypes.map(t => "*." + t).join(", ");

            MessageBox.error(
                this.i18n().getText("message.invalidFileType", [sWrongType]),
                {
                    title: this.i18n().getText("message.invalidFileType.title"),
                    details: this.i18n().getText("message.invalidFileType.details", [sSupportedTypes]),

                }
            );
        },

        // === Excel Datei einlesen und verarbeiten ===
        onFileChange: async function (oEvent) {

            this._reset();
            const oViewModel = this.getViewModel();
            if (!oViewModel) {
                this._showError(this.i18n().getText(), "error.modelNotFound", "Error: Model data not found.");
                return;
            }

            oViewModel.setProperty("/uploadStatus", "P");
            oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadInProgress"));

            // Retrieve file from event and check preconditions
            const oFile = oEvent.getParameter("files") && oEvent.getParameter("files")[0];
            if (!oFile || !window.FileReader) {
                MessageBox.error(this.i18n().getText("error.fileApiNotSupported"));
                return;
            }
            const sExtension = oFile.name.split('.').pop().toLowerCase();
            if (sExtension !== "xlsx") {
                MessageToast.show(this.i18n().getText("message.wrongFileFormat"));
                oViewModel.setProperty("/uploadStatus", "W");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.wrongFileFormat"));
                return;
            }

            try {
                // Read file content asynchronously (as ArrayBuffer)
                const data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = evt => resolve(evt.target.result);
                    reader.onerror = evt => reject(evt.target.error || new Error("File read error"));
                    reader.readAsArrayBuffer(oFile);
                });

                // Parse Excel workbook(s)
                const workbook = XLSX.read(data, { type: "binary" });
                workbook.SheetNames.forEach(sheetName => {
                    // Get the worksheet by name
                    const worksheet = workbook.Sheets[sheetName];
                    // Get first row with technical keys (header row)
                    const aHeaderRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] || [];
                    // Collect all column keys from the header row
                    const aExpectedKeys = Object.values(this.TsFields).filter(field =>
                        field !== this.TsFields.STATUS && field !== this.TsFields.STATUS_MESSAGE
                    );
                    // Check: Are all required columns present?
                    const aMissingKeys = aExpectedKeys.filter(key => !aHeaderRow.includes(key));
                    if (aMissingKeys.length > 0) {
                        throw this.i18n().getText("message.missingColumns", [aMissingKeys.join(", ")]);
                    }
                    // Check if the first data row (2nd row) is not empty
                    const aFirstDataRow = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[1] || [];
                    const bDataRowEmpty = aFirstDataRow.every(cell => cell === null || cell === "" || cell === undefined);
                    if (bDataRowEmpty) {
                        throw this.i18n().getText("message.emptyDataRow");
                    }
                });

                const aDateFields = [
                    FieldDefinitions.ScheduleFields.PLANNED_START_DATE,
                    FieldDefinitions.ScheduleFields.PLANNED_END_DATE,
                    FieldDefinitions.ScheduleFields.BASELINE_START_DATE,
                    FieldDefinitions.ScheduleFields.BASELINE_END_DATE,
                ];

                const aFieldOrder = [

                    this.TsFields.WBS_ID,
                    this.TsFields.PLANNED_START_DATE,
                    this.TsFields.PLANNED_END_DATE,
                    this.TsFields.BASELINE_START_DATE,
                    this.TsFields.BASELINE_END_DATE,
                    this.TsFields.POC,
                    this.TsFields.MILESTONE,
                    this.TsFields.MILESTONE_NAME,
                    this.TsFields.DESCRIPTION
                ];

                const aScheduleEntries = [];

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const aRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                    const aDataRows = aRows.slice(1);
                    aDataRows.forEach(row => {
                        if (row?.every(cell => cell === null || cell === "" || cell === undefined)) {
                            return; // Skip leere Zeilen
                        }


                        const oEntry = {};
                        aFieldOrder.forEach((fieldKey, i) => {
                            oEntry[fieldKey] = row[i];
                        });


                        aDateFields.forEach((sDateKey) => {
                            const rawDate = oEntry[sDateKey];
                            oEntry[sDateKey] = typeof rawDate === "number"
                                ? this._formatExcelDate(rawDate)
                                : this._formatInputToDate(rawDate);
                        });

                        oEntry.dontCreate = false;
                        oEntry[this.TsFields.STATUS] = "P";
                        oEntry[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pending");
                        console.log("Raw Entry:", oEntry);
                        aScheduleEntries.push(oEntry);
                    });
                });


                // Write read data and metadata to the ViewModel
                oViewModel.setProperty("/fileName", oFile.name);
                oViewModel.setProperty("/filePath", oEvent.getParameter("newValue"));
                oViewModel.setProperty("/uploadStatus", "S");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadedSucessfully"));
                oViewModel.setProperty("/busy", false);
                oViewModel.setProperty("/scheduleData", aScheduleEntries);
                oViewModel.setProperty("/existingEntries", []);

                // Set schedule data to ViewModel
                if (aScheduleEntries.length === 0) {
                    throw this.i18n().getText("message.noDataRows");
                }




            } catch (error) {
                const sErrorMsg = error instanceof Error ? error.message : String(error);
                MessageBox.error(sErrorMsg);
                oViewModel.setProperty("/uploadStatus", "E");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadingFailed"));
            } finally {
                // Reset FileUploader
                const oFileUploader = this.byId("fileUploader");
                oFileUploader.setValueState("None");
                oFileUploader.setValueStateText("");
                oFileUploader.setValue("");
            }

            // === Validierung und Backend-Upload ===
            await this._validateEntries();
            // await this._createScheduleEntries();
            try {
                await this._processExcelData();

            } catch (error) {

                const sErrorMsg = error instanceof Error ? error.message : String(error);

                MessageBox.error(sErrorMsg);
                oViewModel.setProperty("/uploadStatus", "E");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadingFailed"));

            }finally {
                 oViewModel.refresh(true);
            }
            

        },

        buildSchedulePayload: function (oExcelRow) {
            return {

                WbsID: oExcelRow[this.TsFields.WBS_ID],
                PlannedStartDate: this._formatDateToString(oExcelRow[this.TsFields.PLANNED_START_DATE]),
                PlannedEndDate: this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]),
                BaselineStartDate: this._formatDateToString(oExcelRow[this.TsFields.BASELINE_START_DATE]),
                BaselineEndDate: this._formatDateToString(oExcelRow[this.TsFields.BASELINE_END_DATE]),
                PercentageOfCompletion: oExcelRow[this.TsFields.POC],
                Milestone: oExcelRow[this.TsFields.MILESTONE],
                MilestoneName: oExcelRow[this.TsFields.MILESTONE_NAME],
                Status: oExcelRow[this.TsFields.STATUS],
                StatusMessage: oExcelRow[this.TsFields.STATUS_MESSAGE],
                Description: oExcelRow[this.TsFields.DESCRIPTION]
            };
        },

        // === Validierung der Einträge ===
        _validateEntries: async function () {
            const oViewModel = this.getViewModel();
            const aExcelData = oViewModel.getProperty("/scheduleData") || [];


            aExcelData.forEach(oExcelRow => {
                const aValidationErrors = [];

                // Pflichtfelder prüfen
                const aMissingFields = this._validateMandatoryFields(oExcelRow, oExcelRow[this.TsFields.MILESTONE] === "P" || oExcelRow[this.TsFields.MILESTONE] === "M");
                if (aMissingFields.length > 0) {
                    const sFields = aMissingFields.join(", ");
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.missingMandatoryFields", [sFields]);
                    oExcelRow.dontCreate = true;
                    return;
                }

                // Datumsfelder validieren
                const dateFields = [
                    this.TsFields.PLANNED_START_DATE,
                    this.TsFields.PLANNED_END_DATE,
                    this.TsFields.BASELINE_START_DATE,
                    this.TsFields.BASELINE_END_DATE
                ];
                if (!dateFields.every(field => this._isValidDate(oExcelRow[field]))) {
                    aValidationErrors.push(this.i18n().getText("status.entry.invalidDate"));
                }

                // Prüfen, ob Enddatum vor Startdatum liegt
                const plannedStart = oExcelRow[this.TsFields.PLANNED_START_DATE];
                const plannedEnd = oExcelRow[this.TsFields.PLANNED_END_DATE];
                if (this._isValidDate(plannedStart) && this._isValidDate(plannedEnd) && plannedEnd < plannedStart) {
                    aValidationErrors.push(this.i18n().getText("status.entry.endBeforeStart"));
                }

                const baselineStart = oExcelRow[this.TsFields.BASELINE_START_DATE];
                const baselineEnd = oExcelRow[this.TsFields.BASELINE_END_DATE];
                if (this._isValidDate(baselineStart) && this._isValidDate(baselineEnd) && baselineEnd < baselineStart) {
                    aValidationErrors.push(this.i18n().getText("status.entry.endBeforeStartBaseline"));
                }

                // Validierung für PercentageOfCompletion (YY1_PM_PoC_PTD)
                const PercentageOfCompletion = oExcelRow[this.TsFields.POC];
                const sPocValue = oExcelRow[this.TsFields.POC];
                if (sPocValue !== undefined && sPocValue !== null && sPocValue !== "") {
                    const fPocValue = parseFloat(sPocValue);
                    // Prüfe, ob es eine gültige Zahl ist
                    if (isNaN(fPocValue)) {
                        aValidationErrors.push(this.i18n().getText("status.entry.invalidPoC", [sPocValue]));
                    } else {
                        // Prüfe Bereich (0 bis 100)
                        if (fPocValue < 0 || fPocValue > 100) {
                            aValidationErrors.push(this.i18n().getText("status.entry.PoCOutOfRange", [sPocValue]));
                        }
                        // Prüfe Dezimalstellen (max. 3)
                        const sDecimalPart = String(sPocValue).split(".")[1];
                        if (sDecimalPart && sDecimalPart.length > 3) {
                            aValidationErrors.push(this.i18n().getText("status.entry.PoCTooManyDecimals", [sPocValue]));
                        }
                    }
                }
                if (aValidationErrors.length > 0) {
                    oExcelRow.dontCreate = true;
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = aValidationErrors.join("\n");
                    return;
                }

                oExcelRow[this.TsFields.STATUS] = "P";
                oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pending");

                //TODO : milestone-Validierung

            });

            oViewModel.setProperty("/scheduleData", aExcelData);
            oViewModel.refresh(true);

        },

        // === (Optional) Pflichtfeld-Validierung ===
        _validateMandatoryFields: function (oExcelRow, bIsMilestone) {

            return FieldDefinitions.getMandatoryFields(bIsMilestone)
                .filter(fieldKey =>
                    oExcelRow[fieldKey] === undefined ||
                    oExcelRow[fieldKey] === null ||
                    oExcelRow[fieldKey] === ""
                );

        },

        // === Backend-Upload der Einträge ===
        _createScheduleEntries: async function () {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            const oViewModel = this.getViewModel();
            const aExcelData = oViewModel.getProperty("/scheduleData") || [];
            var sProjectUUID;
            if (!aExcelData.length) {
                MessageBox.warning(this.i18n().getText("status.noDataToUpload"));
                return;
            }

            for (let i = 0; i < aExcelData.length; i++) {
                const oRow = aExcelData[i];
                if (oRow.dontCreate) continue;


                // const sProjectId = oRow[this.TsFields.PROJECT_ID];  // z. B. "10.30.00002"
                const sWbsId = oRow[this.TsFields.WBS_ID];          // z. B. "10.30.00002.101"

                try {
                    // ProjectElement direkt über ProjectElement-Key lesen (nicht mehr über UUID!)
                    const aElements = await new Promise((resolve, reject) => {
                        oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                            filters: [
                                new Filter("ProjectElement", FilterOperator.EQ, sWbsId)
                            ],
                            urlParameters: {
                                $select: "ProjectElementUUID,ProjectUUID"
                            },

                            success: oData => resolve(oData.results || []),
                            error: oErr => reject(oErr)
                        });
                    });

                    if (aElements.length === 0) {
                        oRow[this.TsFields.STATUS] = "E";
                        oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pspNotFound", [sWbsId]);
                        continue;
                    }

                    const sProjectElementUUID = aElements[0].ProjectElementUUID;
                    // await this._checkMilestoneStatus(oRow);

                    // Payload bauen
                    const oPayload = this._buildSchedulePayload(oRow);

                    await new Promise((resolve, reject) => {
                        oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${sProjectElementUUID}')`, oPayload, {
                            success: () => {
                                oRow[this.TsFields.STATUS] = "S";
                                oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.updated");

                                resolve();
                            },
                            error: oError => {

                                let sErrorMsg;
                                try { sErrorMsg = JSON.parse(oError.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                                oRow[this.TsFields.STATUS] = "E";
                                oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
                                console.error(`Error at entry ${i + 1}:`, oError);
                                reject(oError);
                            }
                        });
                    });

                } catch (oError) {
                    let sErrorMsg;
                    try { sErrorMsg = JSON.parse(oError.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
                    // console.error(`Fehler bei Eintrag ${i + 1}:`, oError);
                }

                oViewModel.setProperty("/scheduleData", aExcelData);
                console.log(this.getViewModel().getProperty("/scheduleData"));
                // console.log(this._getMilestones(sProjectUUID));
                console.log("Updated schedule data:", aExcelData);
                oViewModel.refresh(true);
            }

            MessageToast.show(this.i18n().getText("message.processingFinished"));
        },


        // === ProjectUUID aus Backend holen ===
        _getProjectUUID: async function (oModel, sProjectId) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const aResults = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProject", {
                        filters: [new sap.ui.model.Filter("Project", FilterOperator.EQ, sProjectId)],
                        urlParameters: {
                            "$top": 1,
                            "$select": "ProjectUUID"
                        },
                        success: oData => {
                            const aData = oData.results || [];
                            resolve(aData);
                        },
                        error: oError => {

                            console.error("[_getProjectUUID] Error during API call:", oError);
                            console.log("sProjectId:", sProjectId);
                            reject(this.i18n().getText("error.getProjectUUID.failed"));
                        }
                    });
                });

                // Ergebnis auswerten
                if (aResults.length > 0) {
                    return aResults[0].ProjectUUID;
                } else {
                    throw this.i18n().getText("error.getProjectUUID.notFound");
                }

            } catch (error) {
                throw error; // weiterreichen zur Aufrufer-Fehlerbehandlung
            }
        },

        __getProjectUUID: async function (oModel, sProjectId) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            return new Promise((resolve, reject) => {
                oScheduleApiModel.read("/A_EnterpriseProject", {
                    urlParameters: {
                        "$top": 1,
                        "$filter": `Project eq '${sProjectId}'`,
                        "$select": "ProjectUUID",
                        "$inlinecount": "allpages"
                    },
                    success: oData => {
                        resolve(oData.results[0] || {})
                    },
                    error: oError => {
                        console.error("[_getProjectUUID] Error during API call:", oError);
                        reject(this.i18n().getText("error.getProjectUUID.failed"));
                        console.log("sProjectId:", sProjectId);
                    }
                });
            });
        },

        // === Payload für Backend-Update bauen ===
        _buildSchedulePayload: function (oExcelRow) {
            return {

                PlannedStartDate: this._formatDateToString(oExcelRow[this.TsFields.PLANNED_START_DATE]),
                PlannedEndDate: this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]),
                YY1_PM_BaselineStart_PTD: this._formatDateToString(oExcelRow[this.TsFields.BASELINE_START_DATE]),
                YY1_PM_BaselineEnd_PTD: this._formatDateToString(oExcelRow[this.TsFields.BASELINE_END_DATE]),
                YY1_PM_PoC_PTD: (oExcelRow[this.TsFields.POC])
                // Milestone: oExcelRow[this.TsFields.MILESTONE],
                // MilestoneName: oExcelRow[this.TsFields.MILESTONE_NAME],


            };
        },
        // === Milestones ===
        _createMilestones: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            const oViewModel = this.getViewModel();

            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.WBS_ID]);
                const sMilestonePrefix = oRow[this.TsFields.MILESTONE_NAME]?.substring(0, 5) || null;
                if (!sMilestonePrefix) {
                    throw new Error(this.i18n().getText("status.milestone.wrongPrefix"));
                }

                const milestoneExists = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectUUID", FilterOperator.EQ, oUUIDs.ProjectUUID),
                            new Filter("ProjectElementDescription", FilterOperator.StartsWith, sMilestonePrefix),

                        ],
                        success: oData => resolve(oData.results?.length > 0),
                        error: oErr => reject(oErr)
                    });
                });

                // if (milestoneExists) {
                //     throw {
                //         status: 'I',
                //         statusMessage: this.i18n().getText("status.milestone.alreadyExists", [sMilestonePrefix])

                //     };
                // }
                if (milestoneExists) {
                    const error = new Error(this.i18n().getText("status.milestone.alreadyExists", [sMilestonePrefix]));
                    error.status = 'I';
                    throw error;
                }

                const oPayload = {
                    ProjectElementDescription: oRow[this.TsFields.MILESTONE_NAME],
                    PlannedEndDate: this._formatDateToString(oRow[this.TsFields.PLANNED_END_DATE]),
                    IsProjectMilestone: "X",
                    IsMainMilestone: oRow[this.TsFields.MILESTONE] === "P"
                };

                await new Promise((resolve, reject) => {
                    oScheduleApiModel.create(
                        `/A_EnterpriseProjectElement(guid'${oUUIDs.ProjectElementUUID}')/to_SubProjElement`,
                        oPayload,
                        {
                            success: () => {
                                oRow[this.TsFields.STATUS] = "S";
                                (oRow[this.TsFields.STATUS_MESSAGE] || "") + "\n" + this.i18n().getText("status.milestone.created");
                                resolve();
                            },
                            error: oErr => {
                                let sErrorMsg;
                                try { sErrorMsg = JSON.parse(oErr.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                                oRow[this.TsFields.STATUS] = "E";
                                (oRow[this.TsFields.STATUS_MESSAGE] || "") + "\n" + (sErrorMsg || this.i18n().getText("status.milestone.failed"));
                                reject(oErr);
                            }
                        }
                    );
                });
            } catch (error) {
                oRow[this.TsFields.STATUS] = error.status || "E";
                oRow[this.TsFields.STATUS_MESSAGE] = error.message || error.statusMessage || this.i18n().getText("status.milestone.failed");
               

            }
        },
        _updateProjectElement: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");

            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.WBS_ID]);
                if (oUUIDs === null) {
                    throw {
                        status: 'E',
                        statusMessage: this.i18n().getText("status.entry.wbsNotFound", [oRow[this.TsFields.WBS_ID]])
                    };
                }
                const oPayload = this._buildSchedulePayload(oRow);

                await new Promise((resolve, reject) => {
                    oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${oUUIDs.ProjectElementUUID}')`, oPayload, {
                        success: () => {
                            oRow[this.TsFields.STATUS] = "S";
                            oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.updated");
                            resolve();
                        },
                        error: oError => {
                            debugger;
                            let sErrorMsg;
                            try { sErrorMsg = JSON.parse(oError.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                            oRow[this.TsFields.STATUS] = "E";
                            oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
                            reject(oError);
                        }
                    });
                });

            } catch (error) {
                oRow[this.TsFields.STATUS] = error.status || "E";
                oRow[this.TsFields.STATUS_MESSAGE] = error.statusMessage || this.i18n().getText("status.entry.cantReadErrorTextResult");
                this.getViewModel().refresh(true);
            }
        },
        _processExcelData: async function () {
            const oScheduleData = this.getViewModel().getProperty("/scheduleData");
            if (!oScheduleData || oScheduleData.length === 0) {
                throw new Error(this.i18n().getText("message.noDataRows"));
            }
            for (const oRow of oScheduleData) {
                if (oRow.dontCreate) {
                    continue;
                }
                if (oRow[this.TsFields.MILESTONE]) {
                    await this._createMilestones(oRow);
                } else {
                    await this._updateProjectElement(oRow);
                }
            }
        },

        // === Hilfsfunktionen für Datumskonvertierung ===
        _getProjectElementData: async function (sWbsId) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const aElements = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectElement", FilterOperator.EQ, sWbsId),
                            new Filter("WBSElementInternalID", FilterOperator.NE, 0)
                        ],
                        urlParameters: {
                            $select: "ProjectElementUUID,ProjectUUID"
                        },
                        success: oData => resolve(oData.results || []),
                        error: oErr => reject(oErr)
                    });
                });

                if (aElements.length === 0) {
                    return null;
                    // throw new Error(this.i18n().getText("status.entry.pspNotFound", [sWbsId]));
                }

                return {
                    ProjectElementUUID: aElements[0].ProjectElementUUID,
                    ProjectUUID: aElements[0].ProjectUUID
                };
            } catch (error) {
                throw error;
            }
        },

        _formatDateToString: function (oDate) {
            if (!(oDate instanceof Date) || isNaN(oDate)) {
                return null;
            }
            const year = oDate.getUTCFullYear();
            const month = String(oDate.getUTCMonth() + 1).padStart(2, "0");
            const day = String(oDate.getUTCDate()).padStart(2, "0");
            return `${year}-${month}-${day}T00:00:00`;
        },

        _formatInputToDate: function (sDate) {
            if (!sDate) {
                return null;
            }
            if (typeof sDate !== "string") {
                sDate = String(sDate);
            }
            const cleaned = sDate.trim();
            // Format: YYYYMMDD
            if (/^\d{8}$/.test(cleaned)) {
                const year = +cleaned.slice(0, 4);
                const month = +cleaned.slice(4, 6) - 1;
                const day = +cleaned.slice(6, 8);
                return new Date(Date.UTC(year, month, day, 0, 0, 0));
            }
            // Format: D.M.YYYY or D-M-YYYY or D/M/YYYY
            const match = cleaned.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
            if (match) {
                const day = +match[1];
                const month = +match[2] - 1;
                const year = +match[3];
                return new Date(Date.UTC(year, month, day, 0, 0, 0));
            }
            return null; // Invalid or unsupported format
        },

        _formatExcelDate: function (excelDate) {
            const dateObj = XLSX.SSF.parse_date_code(excelDate);
            return dateObj
                ? new Date(Date.UTC(dateObj.y, dateObj.m - 1, dateObj.d))
                : null;
        },

        _isValidDate: function (oDate) {
            return oDate instanceof Date && !isNaN(oDate.getTime());
        },

        // === ViewModel zurücksetzen ===
        _reset: function () {
            // Reset ViewModel properties to initial values
            this.setViewModel(new JSONModel({
                fileName: null,
                filePath: null,
                uploadStatus: "",
                uploadStatusMessage: this.i18n().getText("status.noFileSelected"),
                busy: false,
                scheduleData: [],
                allEntriesStartDate: null,
                allEntriesEndDate: null,
                existingEntries: [],
            }));
        },

        _createMessagePopover: function () {
            this._oMessagePopover = new sap.m.MessagePopover({
                items: {
                    path: "/messages",
                    template: new sap.m.MessageItem({
                        type: "{type}",
                        title: "{message}",
                        description: "{additionalText}"
                    })
                }
            });
            this.getView().addDependent(this._oMessagePopover);
        },





    });

});



