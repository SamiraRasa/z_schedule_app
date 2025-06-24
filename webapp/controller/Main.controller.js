sap.ui.define([
    "at/zeta/ppm/scheduleupload/controller/BaseController",
    "at/zeta/ppm/scheduleupload/util/fieldDefinitions",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/export/Spreadsheet",
    "xlsx",
    "sap/ui/core/BusyIndicator"
], (BaseController, FieldDefinitions, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, Spreadsheet, XLSX, BusyIndicator) => {
    "use strict";

    return BaseController.extend("at.zeta.ppm.scheduleupload.controller.Main", {
        TsFields: FieldDefinitions.ScheduleFields,

        // === Initialisierung ===
        onInit() {
            this._reset();

            // Set more/less view model
            this.setViewModel(new JSONModel({
                currentView: "less"
            }), "viewModel");

            var oProjectIdInput = this.byId("inputProjectId");
            var oWbsIdInput = this.byId("inputWbsId");
            if (oProjectIdInput) {
                oProjectIdInput.attachBrowserEvent("keypress", this.onKeyPress.bind(this));
            }
            if (oWbsIdInput) {
                oWbsIdInput.attachBrowserEvent("keypress", this.onKeyPress.bind(this));
            }

        },


        // === Excel Template Export ===
        onExcelTemplateFileExport: function () {
            const aColumnConfig = FieldDefinitions.getTemplateColumnConfig(this.i18n());
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
            BusyIndicator.show(0);

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
                    debugger;
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
                    this.TsFields.PROJECT_ID,
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

            // await this._createScheduleEntries();
            try {
                await this._validateEntries();
                await this._processExcelData();

            } catch (error) {

                const sErrorMsg = error instanceof Error ? error.message : String(error);
                MessageBox.error(sErrorMsg);
                oViewModel.setProperty("/uploadStatus", "E");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadingFailed"));

            } finally {
                oViewModel.refresh(true);
                BusyIndicator.hide();
            }
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
                    debugger
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
                // Validate Milestone field
                const sMilestone = oExcelRow[this.TsFields.MILESTONE];
                if (sMilestone !== undefined && sMilestone !== null && sMilestone !== "") {
                    if (sMilestone !== "M" && sMilestone !== "P") {
                        aValidationErrors.push(this.i18n().getText("status.entry.invalidMilestone", [sMilestone]));
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
        // _createScheduleEntries: async function () {
        //     const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
        //     const oViewModel = this.getViewModel();
        //     const aExcelData = oViewModel.getProperty("/scheduleData") || [];
        //     var sProjectUUID;
        //     if (!aExcelData.length) {
        //         MessageBox.warning(this.i18n().getText("status.noDataToUpload"));
        //         return;
        //     }

        //     for (let i = 0; i < aExcelData.length; i++) {
        //         const oRow = aExcelData[i];
        //         if (oRow.dontCreate) continue;


        //         const sProjectId = oRow[this.TsFields.PROJECT_ID];  // z. B. "10.30.00002"
        //         const sWbsId = oRow[this.TsFields.WBS_ID];          // z. B. "10.30.00002.101"

        //         try {
        //             // ProjectElement direkt über ProjectElement-Key lesen (nicht mehr über UUID!)
        //             const aElements = await new Promise((resolve, reject) => {
        //                 oScheduleApiModel.read("/A_EnterpriseProjectElement", {
        //                     filters: [
        //                         new Filter("ProjectElement", FilterOperator.EQ, sWbsId)
        //                     ],
        //                     urlParameters: {
        //                         $select: "ProjectElementUUID,ProjectUUID"
        //                     },

        //                     success: oData => resolve(oData.results || []),
        //                     error: oErr => reject(oErr)
        //                 });
        //             });

        //             if (aElements.length === 0) {
        //                 oRow[this.TsFields.STATUS] = "E";
        //                 oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pspNotFound", [sWbsId]);
        //                 continue;
        //             }

        //             const sProjectElementUUID = aElements[0].ProjectElementUUID;
        //             // await this._checkMilestoneStatus(oRow);

        //             // Payload bauen
        //             const oPayload = this._buildSchedulePayload(oRow);

        //             await new Promise((resolve, reject) => {
        //                 oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${sProjectElementUUID}')`, oPayload, {
        //                     success: () => {
        //                         oRow[this.TsFields.STATUS] = "S";
        //                         oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.updated");

        //                         resolve();
        //                     },
        //                     error: oError => {

        //                         let sErrorMsg;
        //                         try { sErrorMsg = JSON.parse(oError.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
        //                         oRow[this.TsFields.STATUS] = "E";
        //                         oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
        //                         console.error(`Error at entry ${i + 1}:`, oError);
        //                         reject(oError);
        //                     }
        //                 });
        //             });

        //         } catch (oError) {
        //             let sErrorMsg;
        //             try { sErrorMsg = JSON.parse(oError.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
        //             oRow[this.TsFields.STATUS] = "E";
        //             oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
        //             // console.error(`Fehler bei Eintrag ${i + 1}:`, oError);
        //         }

        //         // oViewModel.setProperty("/scheduleData", aExcelData);
        //         // console.log(this.getViewModel().getProperty("/scheduleData"));
        //         // // console.log(this._getMilestones(sProjectUUID));
        //         // console.log("Updated schedule data:", aExcelData);

        //     }
        //     oViewModel.setProperty("/scheduleData", aExcelData);
        //     oViewModel.refresh(true);
        //     MessageToast.show(this.i18n().getText("message.processingFinished"));
        // },

        _buildSchedulePayload: function (oExcelRow, bIsMilestoneUpdate = false) {
            const oPayload = {};

            if (bIsMilestoneUpdate) {
                // Only include fields relevant for milestone update
                oPayload.ProjectElementDescription = oExcelRow[this.TsFields.MILESTONE_NAME]?.substring(0, 40) || "";
                oPayload.PlannedEndDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]);
                oPayload.IsMainMilestone = oExcelRow[this.TsFields.MILESTONE] === "P";
                // oPayload.Milestone = oExcelRow[this.TsFields.MILESTONE] || "";
            } else {
                // Full payload for other updates
                oPayload.PlannedStartDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_START_DATE]);
                oPayload.PlannedEndDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]);
                oPayload.YY1_PM_BaselineStart_PTD = this._formatDateToString(oExcelRow[this.TsFields.BASELINE_START_DATE]);
                oPayload.YY1_PM_BaselineEnd_PTD = this._formatDateToString(oExcelRow[this.TsFields.BASELINE_END_DATE]);
                // oPayload.YY1_PM_PoC_PTD = oExcelRow[this.TsFields.POC] ? parseFloat(oExcelRow[this.TsFields.POC]) : null;
                oPayload.YY1_PM_PoC_PTD = oExcelRow[this.TsFields.POC];
                // oPayload.Milestone = oExcelRow[this.TsFields.MILESTONE] || "";
                // oPayload.ProjectElementDescription = oExcelRow[this.TsFields.MILESTONE_NAME]?.substring(0, 40) || "";
                // oPayload.Description = oExcelRow[this.TsFields.DESCRIPTION] || "";
                // oPayload.IsMainMilestone = oExcelRow[this.TsFields.MILESTONE] === "P";
            }

            return oPayload;
        },

        // === Milestones ===
        // _createMilestones: async function (oRow) {
        //     const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
        //     const oViewModel = this.getViewModel();
        //     debugger;

        //     try {
        //         const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.PROJECT_ID], true);
        //         const sMilestonePrefix = oRow[this.TsFields.MILESTONE_NAME]?.substring(0, 5).toUpperCase() || null;
        //         if (!sMilestonePrefix) {
        //             throw new Error(this.i18n().getText("status.milestone.wrongPrefix"));
        //         }

        //         const milestoneExists = await new Promise((resolve, reject) => {
        //             oScheduleApiModel.read("/A_EnterpriseProjectElement", {
        //                 filters: [
        //                     new Filter("ProjectUUID", FilterOperator.EQ, oUUIDs.ProjectUUID),
        //                     new Filter("ProjectElementDescription", FilterOperator.StartsWith, sMilestonePrefix),

        //                 ],
        //                 success: oData => resolve(oData.results?.length > 0),
        //                 error: oErr => reject(oErr)
        //             });
        //         });

        //         if (milestoneExists) {
        //             debugger
        //             const error = new Error(this.i18n().getText("status.milestone.alreadyExists", [sMilestonePrefix]));
        //             error.status = 'I';
        //             throw error;
        //         }

        //         const oPayload = {
        //             ProjectElementDescription: oRow[this.TsFields.MILESTONE_NAME],
        //             PlannedEndDate: this._formatDateToString(oRow[this.TsFields.PLANNED_END_DATE]),
        //             IsProjectMilestone: "X",
        //             IsMainMilestone: oRow[this.TsFields.MILESTONE] === "P"
        //         };
        //         debugger;
        //         await new Promise((resolve, reject) => {
        //             oScheduleApiModel.create(
        //                 `/A_EnterpriseProjectElement(guid'${oUUIDs.ProjectElementUUID}')/to_SubProjElement`,
        //                 // `/A_EnterpriseProject(guid'${oUUIDs.ProjectElementUUID}')/to_EnterpriseProjectElement`,
        //                 oPayload,
        //                 {
        //                     success: () => {
        //                         oRow[this.TsFields.STATUS] = "S";
        //                         oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.milestone.created");
        //                         resolve();
        //                     },
        //                     error: oErr => {
        //                         let sErrorMsg;
        //                         try { sErrorMsg = JSON.parse(oErr.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
        //                         oRow[this.TsFields.STATUS] = "E";
        //                         oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.milestone.failed");
        //                         reject(oErr);
        //                     }
        //                 }
        //             );
        //         });
        //     } catch (error) {
        //         oRow[this.TsFields.STATUS] = error.status || "E";
        //         oRow[this.TsFields.STATUS_MESSAGE] = error.message || error.statusMessage || this.i18n().getText("status.milestone.failed");
        //     }

        // },


        // === Milestones ===
        _createMilestones: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.PROJECT_ID], true);
                if (!oUUIDs) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("entry.projectIdNotFound", [oRow[this.TsFields.PROJECT_ID]]);
                }

                const sMilestoneName = oRow[this.TsFields.MILESTONE_NAME]?.substring(0, 40) || "";
                if (!sMilestoneName) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("entry.milestoneWrongPrefix");
                    return;
                }
                // Extract prefix (e.g., "MS 01:" from "MS 01: Testname")
                const sPrefixMatch = sMilestoneName.match(/^MS\s\d{2}:/);
                const sPrefix = sPrefixMatch ? sPrefixMatch[0] : "";
                if (!sPrefix) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("entry.milestoneWrongPrefix", ["Invalid milestone prefix format (e.g., MS 01:)"]);
                    return;
                }

                // Check if milestone exists with the prefix
                const oExistingMilestone = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectUUID", FilterOperator.EQ, oUUIDs.ProjectUUID),
                            new Filter("ProjectElementDescription", FilterOperator.StartsWith, sPrefix),
                            // new Filter("ProjectElementDescription", FilterOperator.StartsWith, sMilestoneName),
                            new Filter("IsProjectMilestone", FilterOperator.EQ, "X")
                        ],
                        urlParameters: { $select: "ProjectElementUUID,ProjectElementDescription,IsMainMilestone" },
                        success: oData => resolve(oData.results?.[0] || null),
                        error: oErr => reject
                    });
                });

                if (oExistingMilestone) {

                    // Update existing milestone

                    const oPayload = this._buildSchedulePayload(oRow, true);
                    await new Promise((resolve, reject) => {
                        oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${oExistingMilestone.ProjectElementUUID}')`, oPayload, {
                            Filters: [
                                new Filter("ProcessingStatus", FilterOperator.EQ, '00'),

                            ],
                            success: () => {
                                oRow[this.TsFields.STATUS] = "S";
                                oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.milestone.updated");
                                resolve();
                            },
                            error: (oErr) => {
                                let sErrorMsg;
                                try { sErrorMsg = JSON.parse(oErr.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                                oRow[this.TsFields.STATUS] = "E";
                                oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.milestoneUpdateFailed");
                                reject(oErr);
                            }
                        });
                    });
                    MessageToast.show(this.i18n().getText("status.milestone.alreadyExists", [sMilestoneName]));

                } else {
                    // Create new milestone
                    const oPayload = {
                        ProjectElementDescription: sMilestoneName,
                        PlannedEndDate: this._formatDateToString(oRow[this.TsFields.PLANNED_END_DATE]),
                        IsProjectMilestone: "X",
                        IsMainMilestone: oRow[this.TsFields.MILESTONE] === "P"
                    };
                    await new Promise((resolve, reject) => {
                        oScheduleApiModel.create(`/A_EnterpriseProjectElement(guid'${oUUIDs.ProjectElementUUID}')/to_SubProjElement`, oPayload, {
                            success: () => {
                                oRow[this.TsFields.STATUS] = "S";
                                oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.milestone.created");
                                resolve();
                            },
                            error: (oErr) => {
                                let sErrorMsg;
                                try { sErrorMsg = JSON.parse(oErr.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                                oRow[this.TsFields.STATUS] = "E";
                                oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.milestoneCreationFailed");
                                reject(oErr);
                            }
                        });
                    });
                }
            } catch (error) {
                oRow[this.TsFields.STATUS] = error.status || "E";
                oRow[this.TsFields.STATUS_MESSAGE] = error.messageBoxText || this.i18n().getText("status.milestone.failed");
            }
        },
        _updateProjectElement: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");

            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.WBS_ID], false);
                debugger;
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
                // this.getViewModel().refresh(true);
            }
        },

        _processExcelData: async function () {
            const oViewModel = this.getViewModel();
            const aScheduleData = oViewModel.getProperty("/scheduleData") || [];
            if (!aScheduleData.length) {

                // throw {
                //     status: "E",
                //     statusMessage: this.i18n().getText("message.noDataRows")
                // }
            }

            let bHasErrors = false;
            for (const oRow of aScheduleData) {
                if (oRow.dontCreate) continue;
                try {
                    if (oRow[this.TsFields.MILESTONE]) {
                        await this._createMilestones(oRow);
                    } else {
                        await this._updateProjectElement(oRow);
                    }
                } catch (error) {
                    bHasErrors = true;
                }
            }

            oViewModel.setProperty("/scheduleData", aScheduleData);
            oViewModel.refresh(true);
            MessageToast.show(this.i18n().getText(bHasErrors ? "message.processingFinishedWithErrors" : "message.processingFinished"));
        },
  

        _getProjectElementData: async function (sWbsId) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const aElements = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectElement", FilterOperator.EQ, sWbsId),
                            // new Filter("WBSElementInternalID", FilterOperator.NE, 0)
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

        // _getProjectElementData: async function (sWbsId, bIsMilestone = false) {
        //     const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
        //     const aFilters = [
        //         new Filter("ProjectElement", FilterOperator.EQ, sWbsId),
        //         new Filter("IsProjectMilestone", FilterOperator.NE, "X")
        //     ];
        //     if (bIsMilestone) {
        //         aFilters.push(new Filter("ProjectElementOrdinalNumber", FilterOperator.EQ, 0));
        //     }
        //     try {
        //         const aElements = await new Promise((resolve, reject) => {
        //             oScheduleApiModel.read("/A_EnterpriseProjectElement", {
        //                 filters: aFilters,
        //                 urlParameters: {
        //                     $select: "ProjectElementUUID,ProjectUUID"
        //                 },
        //                 success: oData => resolve(oData.results || []),
        //                 error: oErr => reject(this.i18n().getText("error.getProjectElement.failed"))
        //             });
        //         });

        //         if (aElements.length === 0) {
        //             return null;
        //             // throw new Error(this.i18n().getText("status.entry.pspNotFound", [sWbsId]));
        //         }

        //         return {
        //             ProjectElementUUID: aElements[0].ProjectElementUUID,
        //             ProjectUUID: aElements[0].ProjectUUID
        //         };
        //     } catch (error) {
        //         throw error;
        //     }
        // },

        // === Hilfsfunktionen für Datumskonvertierung ===
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
                scheduleData: [],
                allEntriesStartDate: null,
                allEntriesEndDate: null,
                existingEntries: [],
                currentView: "less"

            }));

        },

        // === UI ===
        // === Change less or more View ===
        onViewSwitch: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            var oViewModel = this.getView().getModel("viewModel");
            if (oViewModel) {
                console.log("Switching to view:", sKey);
                oViewModel.setProperty("/currentView", sKey);
                console.log("Current view set to:", oViewModel.getProperty("/currentView"));
            } else {
                console.error("ViewModel not found!");
            }
        },
        // === FilterBar ===
        onKeyPress: function (oEvent) {
            if (oEvent.getParameter("code") === "Enter") {
                this.applyFilters();
            }
        },
        onLiveChange: function (oEvent) {
            var oSource = oEvent.getSource();
            var sValue = oSource.getValue();
            var sId = oSource.getId().split("--")[1];


            if (sValue || sId === "selectStatus") {
                this.applyFilters(true);
            } else {
                this.applyFilters(true);
            }
        },
        applyFilters: function (bLiveChange = false) {
            var oFilterBar = this.byId("filterBar");
            var oViewModel = this.getView().getModel("viewModel");
            var sCurrentView = oViewModel.getProperty("/currentView");
            var oTable = sCurrentView === "more" ? this.byId("moreDetailTable") : this.byId("idscheduleTable");
            var oTableBinding = oTable.getBinding("items");
            var aFilters = [];

            var aFilterItems = oFilterBar.getFilterGroupItems();

            var sProjectId = "";
            var sWbsId = "";
            var sStatus = "";

            aFilterItems.forEach(function (oItem) {
                var sName = oItem.getName();
                var oControl = oItem.getControl();
                if (sName === "projectId") {
                    sProjectId = oControl.getValue();
                }
                if (sName === "wbsId") {
                    sWbsId = oControl.getValue();
                }
                if (sName === "status") {
                    sStatus = oControl.getSelectedKey();
                }
            });

            if (sProjectId) {
                aFilters.push(new sap.ui.model.Filter("projectId", FilterOperator.Contains, sProjectId));
            }
            if (sWbsId) {
                aFilters.push(new sap.ui.model.Filter("wbsId", FilterOperator.Contains, sWbsId));
            }
            if (sStatus && sStatus !== "") {
                aFilters.push(new sap.ui.model.Filter("status", FilterOperator.EQ, sStatus));
            }

            oTableBinding.filter(aFilters.length ? aFilters : []);

            if (!bLiveChange) {
                aFilterItems.forEach(function (oItem) {
                    var oControl = oItem.getControl();
                    if (oControl.setValue) {
                        oControl.setValue("");
                    }
                    if (oControl.setSelectedKey) {
                        oControl.setSelectedKey("");
                    }
                });
            }
        },
        onSearch: function (oEvent) {
            this.applyFilters();
        },
        onResetFilters: function () {
            var oFilterBar = this.byId("filterBar");
            var oTable = this.byId("idscheduleTable");
            var oTableBinding = oTable.getBinding("items");


            oFilterBar.getFilterGroupItems().forEach(function (oItem) {
                var oControl = oItem.getControl();
                if (oControl.setValue) { oControl.setValue(""); }
                if (oControl.setSelectedKey) { oControl.setSelectedKey(""); }
            });

            oTableBinding.filter([]);
        },

    });

});


