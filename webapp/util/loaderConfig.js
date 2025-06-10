sap.ui.loader.config({
    paths: {
        "xlsx": "externalLibs/xlsx_full_min"
    },
    shim: {
        "xlsx": {
            exports: "XLSX"
        }
    }

});