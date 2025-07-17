sap.ui.define([
    "at/zeta/ppm/scheduleupload/controller/BaseController",
    "at/zeta/ppm/scheduleupload/util/fieldDefinitions",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "xlsx",
    "sap/ui/core/BusyIndicator"
], (BaseController, FieldDefinitions, MessageBox, MessageToast, JSONModel, Filter, FilterOperator, XLSX, BusyIndicator) => {
    "use strict";

    return BaseController.extend("at.zeta.ppm.scheduleupload.controller.Main", {
        TsFields: FieldDefinitions.ScheduleFields,

        // === Initialisierung ===
        onInit() {
            this._reset();
            this.getView().setModel(new sap.ui.model.json.JSONModel({
                currentTab: "schedule",
                currentView: "less",

            }), "viewModel");
        },

        onExcelTemplateFileExport: function () {
            const oI18n = this.i18n();
            const aScheduleColumnsConfig = FieldDefinitions.getScheduleTemplateColumnConfig(oI18n);
            const aScheduleColumns = aScheduleColumnsConfig.map(col => col.label);
            const aScheduleExampleRow = FieldDefinitions.getScheduleTemplateExampleRow(oI18n);

            const aPocColumnsConfig = FieldDefinitions.getPocTemplateColumnConfig(oI18n);
            const aPocColumns = aPocColumnsConfig.map(col => col.label);
            const aPocExampleRow = FieldDefinitions.getPocTemplateExampleRow(oI18n);

            const wsSchedule = XLSX.utils.aoa_to_sheet([aScheduleColumns, aScheduleExampleRow]);
            wsSchedule['!cols'] = aScheduleColumnsConfig.map(col => ({ wch: col.width }));

            const wsPoc = XLSX.utils.aoa_to_sheet([aPocColumns, aPocExampleRow]);
            wsPoc['!cols'] = aPocColumnsConfig.map(col => ({ wch: col.width }));

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, wsSchedule, "Schedule");
            XLSX.utils.book_append_sheet(wb, wsPoc, "PoC");

            XLSX.writeFile(wb, "Schedule_Template.xlsx");

        },

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

            oViewModel.setProperty("/uploadStatus", "P");
            oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadInProgress"));

            const oFile = oEvent.getParameter("files")?.[0];
            if (!oFile || !window.FileReader) {
                // MessageBox.error(this.i18n().getText("error.fileApiNotSupported"));
                 throw new Error(this.i18n().getText("error.fileApiNotSupported"))
                // return;
            }

            try {
                const data = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = evt => resolve(evt.target.result);
                    reader.onerror = evt => reject(evt.target.error || new Error("File read error"));
                    reader.readAsArrayBuffer(oFile);
                });

                const workbook = XLSX.read(data, { type: "binary" });

                const bHasSchedule = workbook.SheetNames.includes("Schedule");
                const bHasPoC = workbook.SheetNames.includes("PoC");

                if (!bHasSchedule && !bHasPoC) {
                    throw new Error(this.i18n().getText("error.notValidSheet"));
                }
                const aDateFields = [
                    this.TsFields.PLANNED_START_DATE,
                    this.TsFields.PLANNED_END_DATE,
                    this.TsFields.BASELINE_START_DATE,
                    this.TsFields.BASELINE_END_DATE,
                ];

                const aFieldOrderSchedule = [
                    this.TsFields.PROJECT_ID,
                    this.TsFields.WBS_ID,
                    this.TsFields.PLANNED_START_DATE,
                    this.TsFields.PLANNED_END_DATE,
                    this.TsFields.BASELINE_START_DATE,
                    this.TsFields.BASELINE_END_DATE,
                    this.TsFields.MILESTONE,
                    this.TsFields.MILESTONE_NAME,
                    this.TsFields.DESCRIPTION
                ];
                const aFieldOrderPoc = [
                    this.TsFields.PROJECT_ID,
                    this.TsFields.WBS_ID,
                    this.TsFields.POC,
                     this.TsFields.DESCRIPTION
                ];

                const aScheduleEntries = [];
                const aPocEntries = [];

                let scheduleHasRow;
                let pocHasRow;


                if (bHasSchedule) {
                    const wsSchedule = workbook.Sheets["Schedule"];
                    const aParsed = this._parseSheet(wsSchedule, aFieldOrderSchedule, aDateFields, true);
                    scheduleHasRow = aParsed.length;

                    aScheduleEntries.push(...aParsed || []);
                }

                if (bHasPoC) {
                    const wsPoC = workbook.Sheets["PoC"];
                    const aParsed = this._parseSheet(wsPoC, aFieldOrderPoc, aDateFields, false);
                    pocHasRow = aParsed.length;

                    aPocEntries.push(...aParsed || []);
                }

                if (!scheduleHasRow && !pocHasRow) {
                    throw new Error(this.i18n().getText("message.noDataRows"));
                }

                const invalidEntries = [...aScheduleEntries, ...aPocEntries].filter(entry => entry[this.TsFields.STATUS] === "E");
                if (invalidEntries.length > 0) {
                    oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("message.invalidDateWarning"));
                }

                oViewModel.setProperty("/fileName", oFile.name);
                oViewModel.setProperty("/filePath", oEvent.getParameter("newValue"));
                oViewModel.setProperty("/uploadStatus", "S");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadedSuccessfully"));
                oViewModel.setProperty("/scheduleData", aScheduleEntries);
                oViewModel.setProperty("/pocData", aPocEntries);
                oViewModel.setProperty("/existingEntries", []);

                if (bHasSchedule) {
                    oViewModel.setProperty("/currentTab", "schedule");
                } else if (bHasPoC) {
                    oViewModel.setProperty("/currentTab", "poc");
                }

                await this._validateEntries();
                await this._processExcelData();

            } catch (error) {
                const sErrorMsg = error instanceof Error ? error.message : String(error);
                MessageBox.error(sErrorMsg);
                oViewModel.setProperty("/uploadStatus", "E");
                oViewModel.setProperty("/uploadStatusMessage", this.i18n().getText("status.fileLoadingFailed"));
            } finally {
                const oFileUploader = this.byId("fileUploader");
                oFileUploader.setValueState("None");
                oFileUploader.setValueStateText("");
                oFileUploader.setValue("");
                oViewModel.refresh(true);
                BusyIndicator.hide();
            }
        },

        _parseSheet: function (worksheet, aFieldOrder, aDateFields, isSchedule) {
            const aRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const aHeaders = aRows[0] || [];
            const aDataRows = aRows.slice(1);

            if (aHeaders?.length !== aFieldOrder.length) {
                throw new Error(this.i18n().getText("error.invalidHeader"));
            }
            return aDataRows
                .filter(row => !(row.every(cell => cell === null || cell === "" || cell === undefined)))
                .map(row => {
                    const oEntry = {};

                    aFieldOrder.forEach((fieldKey, i) => {
                        oEntry[fieldKey] = row[i];
                    });

                    const milestoneValue = oEntry[this.TsFields.MILESTONE]?.trim();
                    if (milestoneValue) {

                        if (milestoneValue !== 'P' && milestoneValue !== 'M') {
                            oEntry[this.TsFields.STATUS] = "E";
                            oEntry[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.invalidMilestone", [milestoneValue]);
                            oEntry.dontCreate = true;
                            oEntry[this.TsFields.WBS_ID] = '';
                        }
                    }
                    else {
                        const projectId = oEntry[this.TsFields.PROJECT_ID] || '';
                        const wbsId = oEntry[this.TsFields.WBS_ID] || '';
                        const normalizedWbsId = (wbsId != null ? String(wbsId).replace(/\./g, '') : '');
                        oEntry[this.TsFields.WBS_ID] = `${projectId}.${normalizedWbsId}`;
                    }
                    let hasInvalidDate = false;
                    aDateFields.forEach(sDateKey => {
                      
                        const rawDate = oEntry[sDateKey];
                        if (rawDate) {
                            if (typeof rawDate === 'number') {
                                const formattedDate = this._formatExcelDate(rawDate);
                                if (formattedDate instanceof Date) {
                                    oEntry[sDateKey] = formattedDate;
                                } else {
                                    oEntry[sDateKey] = rawDate;
                                    hasInvalidDate = true;
                                }
                            } else if (typeof rawDate === 'string') {
                                const formattedDate = this._formatInputToDate(rawDate);
                                if (formattedDate instanceof Date) {
                                    oEntry[sDateKey] = formattedDate;
                                } else {
                                    oEntry[sDateKey] = rawDate;
                                    hasInvalidDate = true;
                                }
                            } else {
                                oEntry[sDateKey] = rawDate;
                                hasInvalidDate = true;
                            }
                        } else {
                            oEntry[sDateKey] = null;
                        }
                    });

                    oEntry.dontCreate = hasInvalidDate;
                    oEntry[this.TsFields.STATUS] = hasInvalidDate ? "E" : "P";
                    oEntry[this.TsFields.STATUS_MESSAGE] = hasInvalidDate
                        ? this.i18n().getText("status.entry.invalidDate")
                        : this.i18n().getText("status.entry.pending");

                    return oEntry;
                });
        },

        // === Validierung der Einträge ===
        _validateEntries: async function (bIsMilestone = false) {
            const oViewModel = this.getViewModel();
            const aScheduleData = oViewModel.getProperty("/scheduleData") || [];
            const aPocData = oViewModel.getProperty("/pocData") || [];

            const MIN_DATE = new Date(Date.UTC(1980, 0, 1));

            aScheduleData.forEach(oExcelRow => {
                const aValidationErrors = [];
                if (oExcelRow.dontCreate) {
                    return;
                }

                const milestoneValue = oExcelRow[this.TsFields.MILESTONE]?.trim();
                if (milestoneValue && milestoneValue !== 'P' && milestoneValue !== 'M') {
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.invalidMilestone", [milestoneValue]);
                    oExcelRow.dontCreate = true;
                    return;
                }

                // Pflichtfelder prüfen
                const aMissingFields = this._validateMandatoryFields(oExcelRow, oExcelRow[this.TsFields.MILESTONE] === "P" || oExcelRow[this.TsFields.MILESTONE] === "M");
                if (aMissingFields.length > 0) {
                    const sFields = aMissingFields.join(", ");
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.missingMandatoryFields", [sFields]);
                    oExcelRow.dontCreate = true;
                    return;
                }

                const dateFields = [
                    this.TsFields.PLANNED_START_DATE,
                    this.TsFields.PLANNED_END_DATE,
                    this.TsFields.BASELINE_START_DATE,
                    this.TsFields.BASELINE_END_DATE
                ];

                dateFields.forEach(field => {
                    const dateValue = oExcelRow[field];
                    if (dateValue) {
                        if (typeof dateValue === 'string' && !this._isValidDate(dateValue)) {
                            aValidationErrors.push(this.i18n().getText("status.entry.invalidDate", [field, "DD.MM.YYYY"]));
                        } else if (typeof dateValue === 'number' && !this._isValidExcelDate(dateValue)) {
                            aValidationErrors.push(this.i18n().getText("status.entry.invalidDate", [field, "DD.MM.YYYY"]));
                        } else if (dateValue instanceof Date && dateValue < MIN_DATE) {
                            aValidationErrors.push(this.i18n().getText("status.entry.dateBefore1980", [field]));
                        }
                    }
                });


                const plannedStart = oExcelRow[this.TsFields.PLANNED_START_DATE];
                const plannedEnd = oExcelRow[this.TsFields.PLANNED_END_DATE];
                if (plannedStart && plannedEnd && plannedStart instanceof Date && plannedEnd instanceof Date) {
                    if (plannedEnd < plannedStart) {
                        aValidationErrors.push(this.i18n().getText("status.entry.endBeforeStart"));
                    }
                }


                const baselineStart = oExcelRow[this.TsFields.BASELINE_START_DATE];
                const baselineEnd = oExcelRow[this.TsFields.BASELINE_END_DATE];
                if (baselineStart && baselineEnd && baselineStart instanceof Date && baselineEnd instanceof Date) {
                    if (baselineEnd < baselineStart) {
                        aValidationErrors.push(this.i18n().getText("status.entry.endBeforeStart"));
                    }
                }


                if (aValidationErrors.length > 0) {
                    oExcelRow.dontCreate = true;
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = aValidationErrors.join("\n");
                } else {
                    oExcelRow[this.TsFields.STATUS] = "P";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pending");
                }
            });

            aPocData.forEach(oExcelRow => {
                const aValidationErrors = [];
                const aMissingFields = [this.TsFields.PROJECT_ID, this.TsFields.WBS_ID, this.TsFields.POC]
                    .filter(fieldKey =>
                        oExcelRow[fieldKey] === undefined ||
                        oExcelRow[fieldKey] === null ||
                        oExcelRow[fieldKey] === ""
                    );
                if (aMissingFields.length > 0) {
                    const sFields = aMissingFields.map(field => this.TsFields[field] || field).join(", ");
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.missingMandatoryFields", [sFields]);
                    oExcelRow.dontCreate = true;
                    return;
                }

                const sPocValue = oExcelRow[this.TsFields.POC];
                const normalizedPocValue = String(sPocValue).trim().replace(',', '.');
                const fPocValue = parseFloat(normalizedPocValue);

                if (isNaN(fPocValue)) {
                    aValidationErrors.push(this.i18n().getText("status.entry.invalidPoC", [sPocValue]));
                } else {
                    if (fPocValue < 0 || fPocValue > 100) {
                        aValidationErrors.push(this.i18n().getText("status.entry.PoCOutOfRange", [sPocValue]));
                    }
                    const sDecimalPart = normalizedPocValue.split(".")[1];
                    if (sDecimalPart && sDecimalPart.length > 3) {
                        aValidationErrors.push(this.i18n().getText("status.entry.PoCTooManyDecimals", [sPocValue]));
                    }
                }

                if (aValidationErrors.length > 0) {
                    oExcelRow.dontCreate = true;
                    oExcelRow[this.TsFields.STATUS] = "E";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = aValidationErrors.join("\n");
                } else {
                    oExcelRow[this.TsFields.STATUS] = "P";
                    oExcelRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.pending");
                }
            });

            oViewModel.setProperty("/scheduleData", aScheduleData);
            oViewModel.setProperty("/pocData", aPocData);
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

        _buildSchedulePayload: function (oExcelRow, bIsMilestoneUpdate = false) {
            const oPayload = {};

            if (bIsMilestoneUpdate) {
                oPayload.ProjectElementDescription = oExcelRow[this.TsFields.MILESTONE_NAME]?.substring(0, 40) || "";
                oPayload.PlannedEndDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]);
                oPayload.IsMainMilestone = oExcelRow[this.TsFields.MILESTONE] === "P";
            } else {
                oPayload.PlannedStartDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_START_DATE]);
                oPayload.PlannedEndDate = this._formatDateToString(oExcelRow[this.TsFields.PLANNED_END_DATE]);
                oPayload.YY1_PM_BaselineStart_PTD = this._formatDateToString(oExcelRow[this.TsFields.BASELINE_START_DATE]);
                oPayload.YY1_PM_BaselineEnd_PTD = this._formatDateToString(oExcelRow[this.TsFields.BASELINE_END_DATE]);
            }

            return oPayload;
        },

        _processExcelData: async function () {
            const oViewModel = this.getViewModel();
            const aScheduleData = oViewModel.getProperty("/scheduleData") || [];
            const aPocData = oViewModel.getProperty("/pocData") || [];

            let bHasErrors = false;
            if (aScheduleData.length > 0) {
                for (const oRow of aScheduleData) {
                    if (oRow.dontCreate) continue;
                    try {
                        if (oRow[this.TsFields.MILESTONE] === "M" || oRow[this.TsFields.MILESTONE] === "P") {
                            await this._createMilestones(oRow);
                        } else {
                            await this._updateProjectElement(oRow);
                        }
                    } catch (error) {
                        bHasErrors = true;
                    }
                }
            }
            if (aPocData.length > 0) {
                for (const oRow of aPocData) {
                    if (oRow.dontCreate) continue;
                    try {
                        await this._updatePoC(oRow);
                    } catch (error) {
                        bHasErrors = true;
                    }
                }
            }

            oViewModel.setProperty("/scheduleData", aScheduleData);
            oViewModel.setProperty("/pocData", aPocData);
            oViewModel.refresh(true);
            MessageToast.show(this.i18n().getText(bHasErrors ? "message.processingFinishedWithErrors" : "message.processingFinished"));
        },

        _updatePoC: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");

            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.WBS_ID], false);
                if (oUUIDs === null) {
                    throw {
                        status: 'E',
                        statusMessage: this.i18n().getText("status.entry.wbsNotFound", [oRow[this.TsFields.WBS_ID]])
                    };
                }

                const oPayload = {
                    YY1_PM_PoC_PTD: String(oRow[this.TsFields.POC])
                };

                await new Promise((resolve, reject) => {
                    oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${oUUIDs.ProjectElementUUID}')`, oPayload, {
                        success: () => {
                            oRow[this.TsFields.STATUS] = "S";
                            oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.updatedPoC");
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
            }
        },

        _getProjectElementData: async function (sWbsId) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const aElements = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectElement", FilterOperator.EQ, sWbsId),
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
                }

                return {
                    ProjectElementUUID: aElements[0].ProjectElementUUID,
                    ProjectUUID: aElements[0].ProjectUUID
                };
            } catch (error) {
                throw error;
            }
        },

        _updateProjectElement: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.WBS_ID], false);
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
            }
        },

        _createMilestones: async function (oRow) {
            const oScheduleApiModel = this.getViewModel("enterpriseProjectAPI");
            try {
                const oUUIDs = await this._getProjectElementData(oRow[this.TsFields.PROJECT_ID], true);
                if (!oUUIDs) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.entry.projectIdNotFound", [oRow[this.TsFields.PROJECT_ID]]);
                    return;
                }

                const sMilestoneName = oRow[this.TsFields.MILESTONE_NAME]?.substring(0, 40) || "";
                if (!sMilestoneName) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("entry.milestoneWrongPrefix");
                    return;
                }

                const sPrefixMatch = sMilestoneName.match(/^MS\s\d{2}:/);
                const sPrefix = sPrefixMatch ? sPrefixMatch[0] : "";
                if (!sPrefix) {
                    oRow[this.TsFields.STATUS] = "E";
                    oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("entry.milestoneWrongPrefix");
                    return;
                }

                const oExistingMilestone = await new Promise((resolve, reject) => {
                    oScheduleApiModel.read("/A_EnterpriseProjectElement", {
                        filters: [
                            new Filter("ProjectUUID", FilterOperator.EQ, oUUIDs.ProjectUUID),
                            new Filter("ProjectElementDescription", FilterOperator.StartsWith, sPrefix),
                            new Filter("IsProjectMilestone", FilterOperator.EQ, "X")
                        ],
                        urlParameters: { $select: "ProjectElementUUID,ProjectElementDescription,IsMainMilestone" },
                        success: oData => resolve(oData.results?.[0] || null),
                        error: oErr => reject
                    });
                });

                if (oExistingMilestone) {
                    const oPayload = this._buildSchedulePayload(oRow, true);
                    await new Promise((resolve, reject) => {
                        oScheduleApiModel.update(`/A_EnterpriseProjectElement(guid'${oExistingMilestone.ProjectElementUUID}')`, oPayload, {
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
                    // MessageToast.show(this.i18n().getText("status.milestone.alreadyExists", [sMilestoneName]));
                } else {
                    const oPayload = {
                        ProjectElementDescription: sMilestoneName,
                        PlannedEndDate: this._formatDateToString(oRow[this.TsFields.PLANNED_END_DATE]),
                        IsProjectMilestone: "X",
                        IsMainMilestone: oRow[this.TsFields.MILESTONE] === "P"
                    };
                    await new Promise((resolve, reject) => {
                        oScheduleApiModel.create(`/A_EnterpriseProject(guid'${oUUIDs.ProjectUUID}')/to_EnterpriseProjectElement`, oPayload, {
                            success: () => {
                                oRow[this.TsFields.STATUS] = "S";
                                oRow[this.TsFields.STATUS_MESSAGE] = this.i18n().getText("status.milestone.created");
                                resolve();
                            },
                            error: (oErr) => {
                                let sErrorMsg;
                                try { sErrorMsg = JSON.parse(oErr.responseText).error?.message?.value; } catch (e) { sErrorMsg = null; }
                                oRow[this.TsFields.STATUS] = "E";
                                oRow[this.TsFields.STATUS_MESSAGE] = sErrorMsg || this.i18n().getText("status.entry.cantReadErrorTextResult");
                                reject(oErr);
                            }
                        });
                    });
                }
            } catch (error) {
                oRow[this.TsFields.STATUS] = error.status || "E";
                oRow[this.TsFields.STATUS_MESSAGE] = error.messageBoxText || this.i18n().getText("status.entry.cantReadErrorTextResult");
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
            if (!sDate || typeof sDate !== 'string') {
                return null; 
            }
                    const cleaned = sDate.trim();
            const dateFormats = [
                { regex: /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/, day: 1, month: 2, year: 3 }, // DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
                { regex: /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/, day: 3, month: 2, year: 1 }, // YYYY.MM.DD, YYYY-MM-DD
                { regex: /^(\d{8})$/, day: 6, month: 4, year: 0 }, // YYYYMMDD
                { regex: /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/, day: 2, month: 1, year: 3 } // MM/DD/YYYY, MM-DD-YYYY
            ];
        
            for (const format of dateFormats) {
                const match = cleaned.match(format.regex);
                if (match) {
                    const day = parseInt(match[format.day], 10);
                    const month = parseInt(match[format.month], 10) - 1;  
                    const year = parseInt(match[format.year], 10);
        
                    if (year < 1980) {
                        return null; 
                    }
                            const date = new Date(Date.UTC(year, month, day, 0, 0, 0));
                    if (date.getUTCFullYear() === year && date.getUTCMonth() === month && date.getUTCDate() === day) {
                        return date;
                    }
                }
            }
        
            return null; 
                },

        _formatExcelDate: function (excelDate) {
            if (typeof excelDate !== 'number' || isNaN(excelDate)) return excelDate;
            try {
                const dateObj = XLSX.SSF.parse_date_code(excelDate);
                if (!dateObj || isNaN(dateObj.y) || isNaN(dateObj.m) || isNaN(dateObj.d)) {
                    return excelDate;
                }
                if (dateObj.y < 1980) {
                    return excelDate;
                }
                const date = new Date(Date.UTC(dateObj.y, dateObj.m - 1, dateObj.d));
                return isNaN(date.getTime()) ? excelDate : date;
            } catch (e) {
                console.error("Error parsing Excel date:", e);
                return excelDate;
            }
        },

        _isValidExcelDate: function (excelDate) {
            if (typeof excelDate !== 'number' || isNaN(excelDate)) return false;
            try {
                const dateObj = XLSX.SSF.parse_date_code(excelDate);
                if (!dateObj || isNaN(dateObj.y) || isNaN(dateObj.m) || isNaN(dateObj.d)) {
                    return false;
                }
                if (dateObj.y < 1980) {
                    return false;
                }
                const date = new Date(Date.UTC(dateObj.y, dateObj.m - 1, dateObj.d));
                return !isNaN(date.getTime());
            } catch (e) {
                console.error("Error validating Excel date:", e);
                return false;
            }
        },

        _isValidDate: function (dateStr) {
            if (!dateStr || typeof dateStr !== 'string') return false;

            const dateFormats = [
                { regex: /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/, day: 1, month: 2, year: 3 }, // DD.MM.YYYY, DD-MM-YYYY, DD/MM/YYYY
                { regex: /^(\d{4})[./-](\d{1,2})[./-](\d{1,2})$/, day: 3, month: 2, year: 1 }, // YYYY.MM.DD, YYYY-MM-DD
                { regex: /^(\d{8})$/, day: 6, month: 4, year: 0 } // YYYYMMDD
            ];

            for (const format of dateFormats) {
                const match = dateStr.match(format.regex);
                if (match) {
                    const day = parseInt(match[format.day], 10);
                    const month = parseInt(match[format.month], 10) - 1;
                    const year = parseInt(match[format.year], 10);

                    if (year < 1980) {
                        return false;
                    }

                    const date = new Date(year, month, day);
                    return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
                }
            }

            return false;
        },

        _reset: function () {
            this.setViewModel(new JSONModel({
                fileName: null,
                filePath: null,
                uploadStatus: "",
                uploadStatusMessage: this.i18n().getText("status.noFileSelected"),
                scheduleData: [],
                allEntriesStartDate: null,
                allEntriesEndDate: null,
                existingEntries: [],
                currentView: "less",
                currentTab: "schedule",

            }));
        },

        onSearch: function (oEvent) {
            var aFilters = [];
            var sProjectId = this.byId("inputProjectId").getValue();
            var sWbsId = this.byId("inputWbsId").getValue();
            var aSelectedStatus = this.byId("selectStatus").getSelectedKeys();
            var oPlannedStartDate = this.byId("plannedStartDate").getDateValue();
            var oPlannedEndDate = this.byId("plannedEndDate").getDateValue();
            var sMilestone = this.byId("selectMilestone").getSelectedKey();

            if (sProjectId) {
                aFilters.push(new Filter("projectId", FilterOperator.Contains, sProjectId.trim().toLowerCase(), false));
            }
            if (sWbsId) {
                aFilters.push(new Filter("wbsId", FilterOperator.Contains, sWbsId));
            }
            if (aSelectedStatus.length > 0) {
                aFilters.push(new Filter(aSelectedStatus.map(sStatus => new Filter("status", FilterOperator.EQ, sStatus)), false));
            }

            var aScheduleFilters = [...aFilters];
            if (oPlannedStartDate) {
                aFilters.push(new Filter("plannedStartDate", FilterOperator.GE, oPlannedStartDate));
            }
            if (oPlannedEndDate) {
                aFilters.push(new Filter("plannedEndDate", FilterOperator.LE, oPlannedEndDate));
            }
            if (sMilestone && sMilestone !== "") {
               
                aFilters.push(new Filter("milestone", FilterOperator.EQ, sMilestone));
            }

            var oViewModel = this.getView().getModel("viewModel");
            var sCurrentTab = oViewModel.getProperty("/currentTab");
            var sCurrentView = oViewModel.getProperty("/currentView");

            if (sCurrentTab === "schedule") {
                var oTableSchedule = this.byId("idscheduleTable");
                var oTableMore = this.byId("moreDetailTable");
                if (sCurrentView === "less" && oTableSchedule?.getBinding("items")) {
                    oTableSchedule.getBinding("items").filter(aFilters);
                }
                if (sCurrentView === "more" && oTableMore?.getBinding("items")) {
                    oTableMore.getBinding("items").filter(aFilters);
                }
            } else if (sCurrentTab === "poc") {
                var oTablePocLess = this.byId("idscheduleTablePoc");
                var oTablePocMore = this.byId("moreDetailPocTable");
                if (sCurrentView === "less" && oTablePocLess?.getBinding("items")) {
                    oTablePocLess.getBinding("items").filter(aFilters);
                }
                if (sCurrentView === "more" && oTablePocMore?.getBinding("items")) {
                    oTablePocMore.getBinding("items").filter(aFilters);
                }
            }
        },

        onFilterBarClear: function () {
            this.byId("inputProjectId").setValue("");
            this.byId("inputWbsId").setValue("");
            this.byId("selectStatus").setSelectedKeys([]);
            this.byId("plannedStartDate").setValue(null);
            this.byId("plannedEndDate").setValue(null);
            this.byId("selectMilestone").setSelectedKey("");
       
            ["idscheduleTable", "moreDetailTable"].forEach(function(sTableId) {
                var oTable = this.byId(sTableId);
                if (oTable) {
                    var oBinding = oTable.getBinding("items");
                    if (oBinding) {
                        oBinding.filter([]);
                    }
                }
            }, this);
            var aTableIds = ["idscheduleTablePoc", "moreDetailPocTable"];
                aTableIds.forEach(function(sTableId) {
                    var oTable = this.byId(sTableId);
                    if (oTable) {
                        var oBinding = oTable.getBinding("items");
                        if (oBinding) {
                            oBinding.filter([]);
                        }
                    }
                }, this);

          
        },

        onFilterChange: function () {
            this.onSearch();
        },

        onViewSwitch: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            this.getViewModel().setProperty("/currentView", sKey);
            
        },

        onTabSwitch: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oViewModel = this.getView().getModel("viewModel");
            oViewModel.setProperty("/currentTab", sKey);
           

        }
    });
});