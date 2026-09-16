var messages = new Array();
var useAppSpecificGroupName = false;
var enableLogging = aa.env.getValue("enableLogging");

try {
    SCRIPT_VERSION = '2.1';
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", null, true));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS", null, true));
    eval(getScriptText("INCLUDES_CUSTOM", null, true));
} catch(e1) {
    addMessage("Problem loading environment " + e1.message);
}

try {
    var result = {
        parents: [] // Holds nested hierarchical tree structure natively
    };

    // These are the CHILD references passed from Node
    var rawChildRefNumbers = aa.env.getValue("referenceNumbers"); 
    
    if (rawChildRefNumbers && rawChildRefNumbers != "") {
        
        var refArray = String(rawChildRefNumbers).split(",");
        var sqlInClause = "";
        var cleanRefList = [];

        for (var i = 0; i < refArray.length; i++) {
            var cleanRef = refArray[i].replace(/[^0-9a-zA-Z]/g, ""); 
            if (cleanRef != "") {
                sqlInClause += (sqlInClause == "" ? "" : ",") + "'" + cleanRef + "'";
                cleanRefList.push(cleanRef);
            }
        }

        if (sqlInClause != "") {
            var sql = "WITH ContactHierarchy AS ( \
                SELECT \
                    CAST(RCASIT.COLUMN_VALUE AS VARCHAR(100))   AS ROOTCHILDREFID, \
                    RC.G1_CONTACT_NBR                           AS PARENTCONTACTNUMBER, \
                    CAST(NULL AS INT)                           AS DIRECTPARENTCONTACTNUMBER, \
                    RC.G1_BUSINESS_NAME                         AS OWNERNAME, \
                    RC.G1_CONTACT_TYPE                          AS CONTACTTYPE, \
                    RC.G1_CONTACT_TYPE_FLAG                     AS OWNERSHIPTYPE, \
                    RC.G1_EMAIL                                 AS EMAIL, \
                    RC.G1_PHONE3                                AS PHONE, \
                    RC.G1_FEDERAL_EMPLOYER_ID_NUM               AS FEIN, \
                    1                                           AS HIERARCHYLEVEL, \
                    CAST( \
                        RCASIT.COLUMN_VALUE + ' > ' + CAST(RC.G1_CONTACT_NBR AS VARCHAR(100)) \
                    AS VARCHAR(4000))                           AS HIERARCHYPATH \
                FROM G3CONTACT RC \
                INNER JOIN GTMPL_TABLE_VALUE RCASIT \
                    ON  RC.SERV_PROV_CODE = RCASIT.SERV_PROV_CODE \
                    AND RC.G1_CONTACT_NBR = RCASIT.ENTITY_SEQ1 \
                WHERE RC.SERV_PROV_CODE     = '" + aa.getServiceProviderCode() + "' \
                    AND RCASIT.SUBGROUP     = 'BUSINESS OWNERSHIP' \
                    AND RCASIT.FIELD_NAME   = 'Reference ID' \
                    AND RCASIT.COLUMN_VALUE IN (" + sqlInClause + ") \
                    AND CAST(RC.G1_CONTACT_NBR AS VARCHAR(100)) <> CAST(RCASIT.COLUMN_VALUE AS VARCHAR(100)) \
                UNION ALL \
                SELECT \
                    cte.ROOTCHILDREFID, \
                    RC_Next.G1_CONTACT_NBR                      AS PARENTCONTACTNUMBER, \
                    cte.PARENTCONTACTNUMBER                     AS DIRECTPARENTCONTACTNUMBER, \
                    RC_Next.G1_BUSINESS_NAME                    AS OWNERNAME, \
                    RC_Next.G1_CONTACT_TYPE                     AS CONTACTTYPE, \
                    RC_Next.G1_CONTACT_TYPE_FLAG                AS OWNERSHIPTYPE, \
                    RC_Next.G1_EMAIL                            AS EMAIL, \
                    RC_Next.G1_PHONE3                           AS PHONE, \
                    RC_Next.G1_FEDERAL_EMPLOYER_ID_NUM          AS FEIN, \
                    cte.HIERARCHYLEVEL + 1                      AS HIERARCHYLEVEL, \
                    CAST( \
                        cte.HIERARCHYPATH + ' > ' + CAST(RC_Next.G1_CONTACT_NBR AS VARCHAR(100)) \
                    AS VARCHAR(4000))                           AS HIERARCHYPATH \
                FROM ContactHierarchy cte \
                INNER JOIN GTMPL_TABLE_VALUE RCASIT_Next \
                    ON  RCASIT_Next.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                    AND RCASIT_Next.SUBGROUP       = 'BUSINESS OWNERSHIP' \
                    AND RCASIT_Next.FIELD_NAME     = 'Reference ID' \
                    AND RCASIT_Next.COLUMN_VALUE   = CAST(cte.PARENTCONTACTNUMBER AS VARCHAR(100)) \
                INNER JOIN G3CONTACT RC_Next \
                    ON  RC_Next.SERV_PROV_CODE = RCASIT_Next.SERV_PROV_CODE \
                    AND RC_Next.G1_CONTACT_NBR = RCASIT_Next.ENTITY_SEQ1 \
                WHERE ('>' + cte.HIERARCHYPATH + '>') NOT LIKE \
                    '%>' + CAST(RC_Next.G1_CONTACT_NBR AS VARCHAR(100)) + '>%' \
                    AND CAST(RC_Next.G1_CONTACT_NBR AS VARCHAR(100)) <> CAST(cte.PARENTCONTACTNUMBER AS VARCHAR(100)) \
            ) \
            SELECT DISTINCT \
                CH.ROOTCHILDREFID, \
                CH.HIERARCHYLEVEL, \
                CH.HIERARCHYPATH, \
                CH.PARENTCONTACTNUMBER, \
                CH.DIRECTPARENTCONTACTNUMBER, \
                CH.OWNERNAME, \
                CH.CONTACTTYPE, \
                CH.OWNERSHIPTYPE, \
                CH.EMAIL, \
                CH.PHONE, \
                CH.FEIN, \
                ASIT_PERCENT.COLUMN_VALUE AS PERCENTOWNED, \
                GTATTR.FIELD_VALUE AS NVBUSINESSID, \
                B_DBA.B1_ALT_ID AS DBAALTID, \
                B2.B1_ALT_ID AS LICENSEALTID, \
                B2.B1_SPECIAL_TEXT AS BUSINESSNAME, \
                ASILIC.B1_CHECKLIST_COMMENT AS LICENSETYPE, \
                COALESCE(ADDR_PRIMARY.B1_STR_NAME,    ADDR_DBA.B1_STR_NAME) AS CONTACTADDRESS, \
                COALESCE(ADDR_PRIMARY.B1_SITUS_COUNTRY, ADDR_DBA.B1_SITUS_COUNTRY) AS COUNTRY, \
                COALESCE(ADDR_PRIMARY.B1_SITUS_CITY,    ADDR_DBA.B1_SITUS_CITY) AS CITY, \
                COALESCE(ADDR_PRIMARY.B1_SITUS_STATE,   ADDR_DBA.B1_SITUS_STATE) AS STATE, \
                COALESCE(ADDR_PRIMARY.B1_SITUS_ZIP,     ADDR_DBA.B1_SITUS_ZIP) AS ZIP \
            FROM ContactHierarchy CH \
            LEFT JOIN GTMPL_ATTRIBUTE GTATTR \
                ON  GTATTR.SERV_PROV_CODE   = '" + aa.getServiceProviderCode() + "' \
                AND GTATTR.ENTITY_SEQ1      = CH.PARENTCONTACTNUMBER \
                AND GTATTR.ASI_GROUP_CODE   = 'LIC_OENTITY' \
                AND GTATTR.SUBGROUP         = 'ENTITY' \
                AND GTATTR.FIELD_NAME       = 'State BL Number' \
            LEFT JOIN ( \
                SELECT \
                    REF.SERV_PROV_CODE, \
                    REF.ENTITY_SEQ1, \
                    REF.COLUMN_VALUE AS OWNER_REF_ID, \
                    PCT.COLUMN_VALUE \
                FROM GTMPL_TABLE_VALUE REF \
                INNER JOIN GTMPL_TABLE_VALUE PCT \
                    ON  PCT.SERV_PROV_CODE = REF.SERV_PROV_CODE \
                    AND PCT.ENTITY_SEQ1    = REF.ENTITY_SEQ1 \
                    AND PCT.SUBGROUP       = REF.SUBGROUP \
                    AND PCT.ROW_INDEX      = REF.ROW_INDEX \
                    AND PCT.FIELD_NAME     = 'Percent Owned' \
                WHERE REF.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                    AND REF.SUBGROUP     = 'BUSINESS OWNERSHIP' \
                    AND REF.FIELD_NAME   = 'Reference ID' \
            ) ASIT_PERCENT \
                ON  ASIT_PERCENT.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                AND ASIT_PERCENT.ENTITY_SEQ1    = CH.PARENTCONTACTNUMBER \
                AND ASIT_PERCENT.OWNER_REF_ID   = CAST(CH.ROOTCHILDREFID AS VARCHAR(100)) \
            LEFT JOIN ( \
                SELECT \
                    SERV_PROV_CODE, \
                    G1_CONTACT_NBR, \
                    B1_PER_ID1, \
                    B1_PER_ID2, \
                    B1_PER_ID3, \
                    ROW_NUMBER() OVER ( \
                        PARTITION BY SERV_PROV_CODE, G1_CONTACT_NBR \
                        ORDER BY B1_PER_ID1 \
                    ) AS rn \
                FROM B3CONTACT \
            ) B \
                ON  B.SERV_PROV_CODE    = '" + aa.getServiceProviderCode() + "' \
                AND B.G1_CONTACT_NBR    = CH.PARENTCONTACTNUMBER \
                AND B.rn = 1 \
            LEFT JOIN B1PERMIT B_DBA \
                ON  B_DBA.SERV_PROV_CODE = B.SERV_PROV_CODE \
                AND B_DBA.B1_PER_ID1     = B.B1_PER_ID1 \
                AND B_DBA.B1_PER_ID2     = B.B1_PER_ID2 \
                AND B_DBA.B1_PER_ID3     = B.B1_PER_ID3 \
                AND B_DBA.B1_PER_GROUP   = 'Licenses' \
                AND B_DBA.B1_PER_TYPE    = 'DBA' \
                AND B_DBA.REC_STATUS     = 'A' \
            LEFT JOIN XAPP2REF X \
                ON  X.SERV_PROV_CODE    = B_DBA.SERV_PROV_CODE \
                AND X.B1_MASTER_ID1     = B_DBA.B1_PER_ID1 \
                AND X.B1_MASTER_ID2     = B_DBA.B1_PER_ID2 \
                AND X.B1_MASTER_ID3     = B_DBA.B1_PER_ID3 \
            LEFT JOIN ( \
                SELECT *, \
                    ROW_NUMBER() OVER ( \
                        PARTITION BY SERV_PROV_CODE, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 \
                        ORDER BY B1_ALT_ID \
                    ) AS rn \
                FROM B1PERMIT \
                WHERE B1_PER_CATEGORY = 'License' \
                  AND REC_STATUS      = 'A' \
            ) B2 \
                ON  B2.SERV_PROV_CODE   = X.SERV_PROV_CODE \
                AND B2.B1_PER_ID1       = X.B1_PER_ID1 \
                AND B2.B1_PER_ID2       = X.B1_PER_ID2 \
                AND B2.B1_PER_ID3       = X.B1_PER_ID3 \
                AND B2.rn = 1 \
            LEFT JOIN BCHCKBOX ASILIC \
                ON  B2.B1_PER_ID1 = ASILIC.B1_PER_ID1 \
                AND B2.B1_PER_ID2 = ASILIC.B1_PER_ID2 \
                AND B2.B1_PER_ID3 = ASILIC.B1_PER_ID3 \
                AND B2.SERV_PROV_CODE = ASILIC.SERV_PROV_CODE \
                AND ASILIC.B1_CHECKBOX_DESC = 'License Type' \
                AND ASILIC.REC_STATUS = 'A' \
            LEFT JOIN ( \
                SELECT *, \
                    ROW_NUMBER() OVER ( \
                        PARTITION BY SERV_PROV_CODE, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 \
                        ORDER BY B1_PRIMARY_ADDR_FLG DESC \
                    ) AS row_num \
                FROM B3ADDRES \
            ) ADDR_PRIMARY \
                ON  ADDR_PRIMARY.SERV_PROV_CODE = B.SERV_PROV_CODE \
                AND ADDR_PRIMARY.B1_PER_ID1     = B.B1_PER_ID1 \
                AND ADDR_PRIMARY.B1_PER_ID2     = B.B1_PER_ID2 \
                AND ADDR_PRIMARY.B1_PER_ID3     = B.B1_PER_ID3 \
                AND ADDR_PRIMARY.row_num = 1 \
            LEFT JOIN ( \
                SELECT \
                    SERV_PROV_CODE, \
                    B1_SPECIAL_TEXT, \
                    B1_PER_ID1, \
                    B1_PER_ID2, \
                    B1_PER_ID3, \
                    ROW_NUMBER() OVER ( \
                        PARTITION BY SERV_PROV_CODE, B1_SPECIAL_TEXT \
                        ORDER BY B1_PER_ID1 \
                    ) AS rn \
                FROM B1PERMIT \
                WHERE B1_PER_GROUP    = 'Licenses' \
                  AND B1_PER_TYPE     = 'DBA' \
                  AND B1_PER_SUB_TYPE = 'NA' \
                  AND B1_PER_CATEGORY = 'NA' \
                  AND REC_STATUS      = 'A' \
            ) B_DBA_OLD \
                ON  B_DBA_OLD.SERV_PROV_CODE  = '" + aa.getServiceProviderCode() + "' \
                AND B_DBA_OLD.B1_SPECIAL_TEXT = CH.OWNERNAME \
                AND B_DBA_OLD.rn = 1 \
            LEFT JOIN ( \
                SELECT *, \
                    ROW_NUMBER() OVER ( \
                        PARTITION BY SERV_PROV_CODE, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 \
                        ORDER BY B1_PRIMARY_ADDR_FLG DESC \
                    ) AS row_num \
                FROM B3ADDRES \
            ) ADDR_DBA \
                ON  ADDR_DBA.SERV_PROV_CODE = B_DBA_OLD.SERV_PROV_CODE \
                AND ADDR_DBA.B1_PER_ID1     = B_DBA_OLD.B1_PER_ID1 \
                AND ADDR_DBA.B1_PER_ID2     = B_DBA_OLD.B1_PER_ID2 \
                AND ADDR_DBA.B1_PER_ID3     = B_DBA_OLD.B1_PER_ID3 \
                AND ADDR_DBA.row_num = 1 \
            ORDER BY \
                CH.ROOTCHILDREFID, \
                CH.HIERARCHYPATH";

            var dbResults = aa.db.select(sql, new Array()).getOutput();
            var mapLookup = {};
            var flatWorkingList = [];
            var foundRefMap = {};

            if (dbResults) {
                dbResults = dbResults.toArray();
                
                for (var r in dbResults) {
                    var originalRow = dbResults[r];
                    var hLevel = parseInt(originalRow.get("HIERARCHYLEVEL") || "1", 10);
                    var rawDirectParent = String(originalRow.get("DIRECTPARENTCONTACTNUMBER") || "").trim();
                    var licAltId = String(originalRow.get("LICENSEALTID") || "");
                    var dbaAltId = String(originalRow.get("DBAALTID") || "").trim();
                    if (dbaAltId === "null") dbaAltId = "";
                    var licCapID = licAltId ? aa.cap.getCapID(licAltId).getOutput() : null;
                    var locationAddress1 = "";
                    
                    if (licCapID) {
                        useAppSpecificGroupName = true;
                        locationAddress1 = getAppSpecific("LOCATION ADDRESS.Address Line 1", licCapID) || "";
                        useAppSpecificGroupName = false;
                    }

                    var rootChildRef = String(originalRow.get("ROOTCHILDREFID") || "");
                    if (rootChildRef) foundRefMap[rootChildRef] = true;

                    var nodeItem = {
                        childReferenceId: rootChildRef,
                        hierarchyLevel: hLevel,
                        hierarchyPath: String(originalRow.get("HIERARCHYPATH") || ""),
                        referenceNbr: String(originalRow.get("PARENTCONTACTNUMBER") || ""),
                        directParentContactNumber: rawDirectParent === "null" ? "" : rawDirectParent,
                        dbaAltId: dbaAltId,
                        licenseAltId: licAltId,
                        licenseType: String(originalRow.get("LICENSETYPE") || ""),
                        businessName: String(originalRow.get("BUSINESSNAME") || ""),
                        locationAddress: String(locationAddress1),
                        pendingApplications: [],
                        ownerName: String(originalRow.get("OWNERNAME") || ""),
                        contactType: String(originalRow.get("CONTACTTYPE") || ""),
                        ownershipType: String(originalRow.get("OWNERSHIPTYPE") || ""),
                        email: String(originalRow.get("EMAIL") || ""),
                        phone: String(originalRow.get("PHONE") || ""),
                        fein: String(originalRow.get("FEIN") || ""),
                        percentOwned: String(originalRow.get("PERCENTOWNED") || originalRow.get("percentOwned") || ""),
                        percentage: String(originalRow.get("PERCENTOWNED") || originalRow.get("percentOwned") || ""),
                        nvBusinessId: String(originalRow.get("NVBUSINESSID") || ""),
                        contactAddress: String(originalRow.get("CONTACTADDRESS") || ""),
                        country: String(originalRow.get("COUNTRY") || ""),
                        city: String(originalRow.get("CITY") || ""),
                        state: String(originalRow.get("STATE") || ""),
                        zip: String(originalRow.get("ZIP") || ""),
                        relatedContacts: []
                    };

                    flatWorkingList.push(nodeItem);
                    
                    var referenceIndexKey = nodeItem.childReferenceId + "_" + nodeItem.hierarchyPath;
                    mapLookup[referenceIndexKey] = nodeItem;
                }

                // Step 2: Assemble nested hierarchy branches safely
                for (var t = 0; t < flatWorkingList.length; t++) {
                    var entityNode = flatWorkingList[t];

                    if (entityNode.hierarchyLevel === 1) {
                        addOrMergeRelatedContact(result.parents, entityNode);
                    } else {
                        var currentPathArray = entityNode.hierarchyPath.split(" > ");
                        currentPathArray.pop(); 
                        var theoreticalParentPath = currentPathArray.join(" > ");
                        
                        var generationLookupKey = entityNode.childReferenceId + "_" + theoreticalParentPath;
                        var targetNodeParent = mapLookup[generationLookupKey];

                        if (targetNodeParent) {
                            // Guard against self-nesting duplicate entries
                            if (targetNodeParent.referenceNbr !== entityNode.referenceNbr) {
                                addOrMergeRelatedContact(targetNodeParent.relatedContacts, entityNode);
                            }
                        } else {
                            addOrMergeRelatedContact(result.parents, entityNode);
                        }
                    }
                }
            }

            // Step 3: Direct lookup for standalone reference numbers without parent records
            var missingRefs = [];
            for (var m = 0; m < cleanRefList.length; m++) {
                var ref = cleanRefList[m];
                if (!foundRefMap[ref]) {
                    missingRefs.push("'" + ref + "'");
                }
            }

            if (missingRefs.length > 0) {
                var missingSqlClause = missingRefs.join(",");
                // No reverse parents: still return licenses this contact is on
                // (direct B3CONTACT on a License, or on a DBA whose children are Licenses).
                var fallbackSql = "SELECT DISTINCT \
                    CAST(C.G1_CONTACT_NBR AS VARCHAR(100)) AS ROOTCHILDREFID, \
                    1 AS HIERARCHYLEVEL, \
                    CAST(C.G1_CONTACT_NBR AS VARCHAR(4000)) AS HIERARCHYPATH, \
                    C.G1_CONTACT_NBR AS PARENTCONTACTNUMBER, \
                    CAST(NULL AS INT) AS DIRECTPARENTCONTACTNUMBER, \
                    C.G1_BUSINESS_NAME AS OWNERNAME, \
                    C.G1_CONTACT_TYPE AS CONTACTTYPE, \
                    C.G1_CONTACT_TYPE_FLAG AS OWNERSHIPTYPE, \
                    C.G1_EMAIL AS EMAIL, \
                    C.G1_PHONE3 AS PHONE, \
                    C.G1_FEDERAL_EMPLOYER_ID_NUM AS FEIN, \
                    '' AS PERCENTOWNED, \
                    GTATTR.FIELD_VALUE AS NVBUSINESSID, \
                    LIC.DBA_ALT_ID AS DBAALTID, \
                    LIC.B1_ALT_ID AS LICENSEALTID, \
                    LIC.B1_SPECIAL_TEXT AS BUSINESSNAME, \
                    ASILIC.B1_CHECKLIST_COMMENT AS LICENSETYPE, \
                    COALESCE(ADDR_PRIMARY.B1_STR_NAME, ADDR_DBA.B1_STR_NAME) AS CONTACTADDRESS, \
                    COALESCE(ADDR_PRIMARY.B1_SITUS_COUNTRY, ADDR_DBA.B1_SITUS_COUNTRY) AS COUNTRY, \
                    COALESCE(ADDR_PRIMARY.B1_SITUS_CITY, ADDR_DBA.B1_SITUS_CITY) AS CITY, \
                    COALESCE(ADDR_PRIMARY.B1_SITUS_STATE, ADDR_DBA.B1_SITUS_STATE) AS STATE, \
                    COALESCE(ADDR_PRIMARY.B1_SITUS_ZIP, ADDR_DBA.B1_SITUS_ZIP) AS ZIP \
                FROM G3CONTACT C \
                INNER JOIN ( \
                    SELECT \
                        BC.SERV_PROV_CODE, \
                        BC.G1_CONTACT_NBR, \
                        P.B1_ALT_ID, \
                        P.B1_SPECIAL_TEXT, \
                        P.B1_PER_ID1, \
                        P.B1_PER_ID2, \
                        P.B1_PER_ID3, \
                        DBA_PARENT.B1_ALT_ID AS DBA_ALT_ID \
                    FROM B3CONTACT BC \
                    INNER JOIN B1PERMIT P \
                        ON  P.SERV_PROV_CODE = BC.SERV_PROV_CODE \
                        AND P.B1_PER_ID1     = BC.B1_PER_ID1 \
                        AND P.B1_PER_ID2     = BC.B1_PER_ID2 \
                        AND P.B1_PER_ID3     = BC.B1_PER_ID3 \
                        AND P.B1_PER_CATEGORY = 'License' \
                        AND P.REC_STATUS      = 'A' \
                    LEFT JOIN XAPP2REF XDBA \
                        ON  XDBA.SERV_PROV_CODE = P.SERV_PROV_CODE \
                        AND XDBA.B1_PER_ID1     = P.B1_PER_ID1 \
                        AND XDBA.B1_PER_ID2     = P.B1_PER_ID2 \
                        AND XDBA.B1_PER_ID3     = P.B1_PER_ID3 \
                    LEFT JOIN B1PERMIT DBA_PARENT \
                        ON  DBA_PARENT.SERV_PROV_CODE = XDBA.SERV_PROV_CODE \
                        AND DBA_PARENT.B1_PER_ID1     = XDBA.B1_MASTER_ID1 \
                        AND DBA_PARENT.B1_PER_ID2     = XDBA.B1_MASTER_ID2 \
                        AND DBA_PARENT.B1_PER_ID3     = XDBA.B1_MASTER_ID3 \
                        AND DBA_PARENT.B1_PER_GROUP   = 'Licenses' \
                        AND DBA_PARENT.B1_PER_TYPE    = 'DBA' \
                        AND DBA_PARENT.REC_STATUS     = 'A' \
                    WHERE BC.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                        AND CAST(BC.G1_CONTACT_NBR AS VARCHAR(100)) IN (" + missingSqlClause + ") \
                    UNION \
                    SELECT \
                        BC.SERV_PROV_CODE, \
                        BC.G1_CONTACT_NBR, \
                        P.B1_ALT_ID, \
                        P.B1_SPECIAL_TEXT, \
                        P.B1_PER_ID1, \
                        P.B1_PER_ID2, \
                        P.B1_PER_ID3, \
                        DBA.B1_ALT_ID AS DBA_ALT_ID \
                    FROM B3CONTACT BC \
                    INNER JOIN B1PERMIT DBA \
                        ON  DBA.SERV_PROV_CODE = BC.SERV_PROV_CODE \
                        AND DBA.B1_PER_ID1     = BC.B1_PER_ID1 \
                        AND DBA.B1_PER_ID2     = BC.B1_PER_ID2 \
                        AND DBA.B1_PER_ID3     = BC.B1_PER_ID3 \
                        AND DBA.B1_PER_GROUP   = 'Licenses' \
                        AND DBA.B1_PER_TYPE    = 'DBA' \
                        AND DBA.REC_STATUS     = 'A' \
                    INNER JOIN XAPP2REF X \
                        ON  X.SERV_PROV_CODE = DBA.SERV_PROV_CODE \
                        AND X.B1_MASTER_ID1  = DBA.B1_PER_ID1 \
                        AND X.B1_MASTER_ID2  = DBA.B1_PER_ID2 \
                        AND X.B1_MASTER_ID3  = DBA.B1_PER_ID3 \
                    INNER JOIN B1PERMIT P \
                        ON  P.SERV_PROV_CODE = X.SERV_PROV_CODE \
                        AND P.B1_PER_ID1     = X.B1_PER_ID1 \
                        AND P.B1_PER_ID2     = X.B1_PER_ID2 \
                        AND P.B1_PER_ID3     = X.B1_PER_ID3 \
                        AND P.B1_PER_CATEGORY = 'License' \
                        AND P.REC_STATUS      = 'A' \
                    WHERE BC.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                        AND CAST(BC.G1_CONTACT_NBR AS VARCHAR(100)) IN (" + missingSqlClause + ") \
                    UNION \
                    SELECT \
                        BC.SERV_PROV_CODE, \
                        BC.G1_CONTACT_NBR, \
                        CAST(NULL AS VARCHAR(30)) AS B1_ALT_ID, \
                        DBA.B1_SPECIAL_TEXT, \
                        CAST(NULL AS VARCHAR(5)) AS B1_PER_ID1, \
                        CAST(NULL AS VARCHAR(5)) AS B1_PER_ID2, \
                        CAST(NULL AS VARCHAR(5)) AS B1_PER_ID3, \
                        DBA.B1_ALT_ID AS DBA_ALT_ID \
                    FROM B3CONTACT BC \
                    INNER JOIN B1PERMIT DBA \
                        ON  DBA.SERV_PROV_CODE = BC.SERV_PROV_CODE \
                        AND DBA.B1_PER_ID1     = BC.B1_PER_ID1 \
                        AND DBA.B1_PER_ID2     = BC.B1_PER_ID2 \
                        AND DBA.B1_PER_ID3     = BC.B1_PER_ID3 \
                        AND DBA.B1_PER_GROUP   = 'Licenses' \
                        AND DBA.B1_PER_TYPE    = 'DBA' \
                        AND DBA.REC_STATUS     = 'A' \
                    WHERE BC.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                        AND CAST(BC.G1_CONTACT_NBR AS VARCHAR(100)) IN (" + missingSqlClause + ") \
                ) LIC \
                    ON  LIC.SERV_PROV_CODE = C.SERV_PROV_CODE \
                    AND LIC.G1_CONTACT_NBR = C.G1_CONTACT_NBR \
                LEFT JOIN GTMPL_ATTRIBUTE GTATTR \
                    ON  GTATTR.SERV_PROV_CODE = C.SERV_PROV_CODE \
                    AND GTATTR.ENTITY_SEQ1 = C.G1_CONTACT_NBR \
                    AND GTATTR.ASI_GROUP_CODE = 'LIC_OENTITY' \
                    AND GTATTR.SUBGROUP = 'ENTITY' \
                    AND GTATTR.FIELD_NAME = 'State BL Number' \
                LEFT JOIN BCHCKBOX ASILIC \
                    ON  ASILIC.SERV_PROV_CODE = LIC.SERV_PROV_CODE \
                    AND ASILIC.B1_PER_ID1 = LIC.B1_PER_ID1 \
                    AND ASILIC.B1_PER_ID2 = LIC.B1_PER_ID2 \
                    AND ASILIC.B1_PER_ID3 = LIC.B1_PER_ID3 \
                    AND ASILIC.B1_CHECKBOX_DESC = 'License Type' \
                    AND ASILIC.REC_STATUS = 'A' \
                LEFT JOIN ( \
                    SELECT \
                        SERV_PROV_CODE, G1_CONTACT_NBR, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3, \
                        ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, G1_CONTACT_NBR ORDER BY B1_PER_ID1) AS rn \
                    FROM B3CONTACT \
                ) B \
                    ON  B.SERV_PROV_CODE = C.SERV_PROV_CODE \
                    AND B.G1_CONTACT_NBR = C.G1_CONTACT_NBR \
                    AND B.rn = 1 \
                LEFT JOIN ( \
                    SELECT *, \
                        ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 ORDER BY B1_PRIMARY_ADDR_FLG DESC) AS row_num \
                    FROM B3ADDRES \
                ) ADDR_PRIMARY \
                    ON  ADDR_PRIMARY.SERV_PROV_CODE = B.SERV_PROV_CODE \
                    AND ADDR_PRIMARY.B1_PER_ID1 = B.B1_PER_ID1 \
                    AND ADDR_PRIMARY.B1_PER_ID2 = B.B1_PER_ID2 \
                    AND ADDR_PRIMARY.B1_PER_ID3 = B.B1_PER_ID3 \
                    AND ADDR_PRIMARY.row_num = 1 \
                LEFT JOIN ( \
                    SELECT SERV_PROV_CODE, B1_SPECIAL_TEXT, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3, \
                        ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, B1_SPECIAL_TEXT ORDER BY B1_PER_ID1) AS rn \
                    FROM B1PERMIT \
                    WHERE B1_PER_GROUP = 'Licenses' AND B1_PER_TYPE = 'DBA' AND B1_PER_SUB_TYPE = 'NA' AND B1_PER_CATEGORY = 'NA' AND REC_STATUS = 'A' \
                ) B_DBA_OLD \
                    ON  B_DBA_OLD.SERV_PROV_CODE = C.SERV_PROV_CODE \
                    AND B_DBA_OLD.B1_SPECIAL_TEXT = C.G1_BUSINESS_NAME \
                    AND B_DBA_OLD.rn = 1 \
                LEFT JOIN ( \
                    SELECT *, \
                        ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 ORDER BY B1_PRIMARY_ADDR_FLG DESC) AS row_num \
                    FROM B3ADDRES \
                ) ADDR_DBA \
                    ON  ADDR_DBA.SERV_PROV_CODE = B_DBA_OLD.SERV_PROV_CODE \
                    AND ADDR_DBA.B1_PER_ID1 = B_DBA_OLD.B1_PER_ID1 \
                    AND ADDR_DBA.B1_PER_ID2 = B_DBA_OLD.B1_PER_ID2 \
                    AND ADDR_DBA.B1_PER_ID3 = B_DBA_OLD.B1_PER_ID3 \
                    AND ADDR_DBA.row_num = 1 \
                WHERE C.SERV_PROV_CODE = '" + aa.getServiceProviderCode() + "' \
                    AND CAST(C.G1_CONTACT_NBR AS VARCHAR(100)) IN (" + missingSqlClause + ")";

                var fbResults = aa.db.select(fallbackSql, new Array()).getOutput();
                if (fbResults) {
                    fbResults = fbResults.toArray();
                    for (var f in fbResults) {
                        var fbRow = fbResults[f];
                        var fbLicAltId = String(fbRow.get("LICENSEALTID") || "").trim();
                        var fbDbaAltId = String(fbRow.get("DBAALTID") || "").trim();
                        if (fbLicAltId === "null") fbLicAltId = "";
                        if (fbDbaAltId === "null") fbDbaAltId = "";
                        if (!fbLicAltId && !fbDbaAltId) continue;

                        var fbLocAddress = fbLicAltId ? getLicenseLocationAddress(fbLicAltId) : "";

                        var standaloneNode = {
                            childReferenceId: String(fbRow.get("ROOTCHILDREFID") || ""),
                            hierarchyLevel: 1,
                            hierarchyPath: String(fbRow.get("HIERARCHYPATH") || ""),
                            referenceNbr: String(fbRow.get("PARENTCONTACTNUMBER") || ""),
                            directParentContactNumber: "",
                            dbaAltId: fbDbaAltId,
                            licenseAltId: fbLicAltId,
                            pendingApplications: [],
                            licenseType: String(fbRow.get("LICENSETYPE") || ""),
                            businessName: String(fbRow.get("BUSINESSNAME") || ""),
                            locationAddress: String(fbLocAddress),
                            ownerName: String(fbRow.get("OWNERNAME") || ""),
                            contactType: String(fbRow.get("CONTACTTYPE") || ""),
                            ownershipType: String(fbRow.get("OWNERSHIPTYPE") || ""),
                            email: String(fbRow.get("EMAIL") || ""),
                            phone: String(fbRow.get("PHONE") || ""),
                            fein: String(fbRow.get("FEIN") || ""),
                            percentOwned: "",
                            percentage: "",
                            nvBusinessId: String(fbRow.get("NVBUSINESSID") || ""),
                            contactAddress: String(fbRow.get("CONTACTADDRESS") || ""),
                            country: String(fbRow.get("COUNTRY") || ""),
                            city: String(fbRow.get("CITY") || ""),
                            state: String(fbRow.get("STATE") || ""),
                            zip: String(fbRow.get("ZIP") || ""),
                            relatedContacts: []
                        };
                        addOrMergeRelatedContact(result.parents, standaloneNode);
                    }
                } else {
                    addMessage("No contact hierarchy or direct license found for reference IDs: " + missingRefs.join(", "));
                }
            }

            // Licenses/Privileged/Gaming/License is the only type with license children.
            expandGamingLicenseChildren(result.parents);
            // Pending applications linked to the same DBA as the license (B1_APPL_STATUS LIKE '%Pending%').
            expandPendingApplications(result.parents);
        }
    } else {
        messages.push("No child reference numbers provided.");
    }

} catch (err) {
    aa.env.setValue("returnCode", "-1");
    aa.env.setValue("returnValue", err.message + " on line " + err.lineNumber);
    addMessage("CRITICAL ERROR: " + err.message);
} finally {
    aa.print(JSON.stringify(result, null, 2));
    result.messages = messages;
    aa.env.setValue("returnCode", "1");
    aa.env.setValue("result", result); 
}

function logInfo(str) {
    if (enableLogging == true) addMessage(str);
}
function addMessage(str) {
    messages.push(str);
}

function findNodeByRef(list, ref) {
    if (!list || !ref) return null;
    for (var i = 0; i < list.length; i++) {
        if (String(list[i].referenceNbr) === String(ref)) return list[i];
    }
    return null;
}

function mergeChildLicenseList(existing, incoming) {
    if (!incoming || !incoming.length) return;
    if (!existing.childLicenses) existing.childLicenses = [];
    for (var i = 0; i < incoming.length; i++) {
        var child = incoming[i];
        var childAlt = String(child.licenseAltId || "").trim();
        var alreadyListed = false;
        for (var j = 0; j < existing.childLicenses.length; j++) {
            if (String(existing.childLicenses[j].licenseAltId) === childAlt) {
                alreadyListed = true;
                break;
            }
        }
        if (!alreadyListed) existing.childLicenses.push(child);
    }
}

function mergePendingApplicationList(existing, incoming) {
    if (!incoming || !incoming.length) return;
    if (!existing.pendingApplications) existing.pendingApplications = [];
    for (var i = 0; i < incoming.length; i++) {
        var app = incoming[i];
        var appAlt = String(app.applicationAltId || "").trim();
        var alreadyListed = false;
        for (var j = 0; j < existing.pendingApplications.length; j++) {
            if (String(existing.pendingApplications[j].applicationAltId) === appAlt) {
                alreadyListed = true;
                break;
            }
        }
        if (!alreadyListed) existing.pendingApplications.push(app);
    }
}

function mergeDuplicateContactNode(existing, incoming) {
    var incomingAlt = String(incoming.licenseAltId || "").trim();
    if (incomingAlt && incomingAlt !== "null") {
        var existingAlt = String(existing.licenseAltId || "").trim();
        if (!existingAlt || existingAlt === "null") {
            existing.licenseAltId = incoming.licenseAltId;
            existing.licenseType = incoming.licenseType;
            existing.businessName = incoming.businessName;
            existing.locationAddress = incoming.locationAddress;
        }
    }
    var incomingDba = String(incoming.dbaAltId || "").trim();
    if (incomingDba && incomingDba !== "null") {
        var existingDba = String(existing.dbaAltId || "").trim();
        if (!existingDba || existingDba === "null") existing.dbaAltId = incomingDba;
    }
    if ((!existing.percentage || existing.percentage === "") && incoming.percentage) {
        existing.percentage = incoming.percentage;
        existing.percentOwned = incoming.percentOwned;
    }
    mergeChildLicenseList(existing, incoming.childLicenses);
    mergePendingApplicationList(existing, incoming.pendingApplications);
    if (incoming.relatedContacts && incoming.relatedContacts.length) {
        for (var r = 0; r < incoming.relatedContacts.length; r++) {
            addOrMergeRelatedContact(existing.relatedContacts, incoming.relatedContacts[r]);
        }
    }
}

function addOrMergeRelatedContact(list, node) {
    if (!list || !node) return;
    var existing = findNodeByRef(list, node.referenceNbr);
    if (existing) mergeDuplicateContactNode(existing, node);
    else list.push(node);
}

function collectLicenseAltIds(nodes, seen) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node) continue;
        var altId = String(node.licenseAltId || "").trim();
        if (altId && altId !== "null") seen[altId] = true;
        if (node.relatedContacts && node.relatedContacts.length) {
            collectLicenseAltIds(node.relatedContacts, seen);
        }
    }
}

function attachChildLicensesToNodes(nodes, childrenByParent) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node) continue;
        var altId = String(node.licenseAltId || "").trim();
        if (altId && childrenByParent[altId] && childrenByParent[altId].length > 0) {
            node.childLicenses = childrenByParent[altId];
        }
        if (node.relatedContacts && node.relatedContacts.length) {
            attachChildLicensesToNodes(node.relatedContacts, childrenByParent);
        }
    }
}

function getLicenseLocationAddress(licAltId) {
    var locationAddress = "";
    if (!licAltId) return locationAddress;
    var licCapID = aa.cap.getCapID(licAltId).getOutput();
    if (licCapID) {
        useAppSpecificGroupName = true;
        locationAddress = getAppSpecific("LOCATION ADDRESS.Address Line 1", licCapID) || "";
        useAppSpecificGroupName = false;
    }
    return locationAddress;
}

function expandGamingLicenseChildren(parents) {
    var seen = {};
    collectLicenseAltIds(parents, seen);

    var inClause = "";
    for (var altId in seen) {
        if (!seen.hasOwnProperty(altId)) continue;
        var cleanAlt = String(altId).replace(/[^0-9a-zA-Z\-]/g, "");
        if (cleanAlt === "") continue;
        inClause += (inClause === "" ? "" : ",") + "'" + cleanAlt + "'";
    }
    if (inClause === "") return;

    var childSql = "SELECT DISTINCT \
        PARENT.B1_ALT_ID AS PARENTLICENSEALTID, \
        CHILD.B1_ALT_ID AS LICENSEALTID, \
        CHILD.B1_SPECIAL_TEXT AS BUSINESSNAME, \
        ASILIC.B1_CHECKLIST_COMMENT AS LICENSETYPE \
    FROM B1PERMIT PARENT \
    INNER JOIN XAPP2REF X \
        ON  X.SERV_PROV_CODE = PARENT.SERV_PROV_CODE \
        AND X.B1_MASTER_ID1  = PARENT.B1_PER_ID1 \
        AND X.B1_MASTER_ID2  = PARENT.B1_PER_ID2 \
        AND X.B1_MASTER_ID3  = PARENT.B1_PER_ID3 \
    INNER JOIN B1PERMIT CHILD \
        ON  CHILD.SERV_PROV_CODE = X.SERV_PROV_CODE \
        AND CHILD.B1_PER_ID1     = X.B1_PER_ID1 \
        AND CHILD.B1_PER_ID2     = X.B1_PER_ID2 \
        AND CHILD.B1_PER_ID3     = X.B1_PER_ID3 \
        AND CHILD.B1_PER_CATEGORY = 'License' \
        AND CHILD.REC_STATUS      = 'A' \
        AND (CHILD.B1_PER_ID1 <> PARENT.B1_PER_ID1 \
          OR CHILD.B1_PER_ID2 <> PARENT.B1_PER_ID2 \
          OR CHILD.B1_PER_ID3 <> PARENT.B1_PER_ID3) \
    LEFT JOIN BCHCKBOX ASILIC \
        ON  ASILIC.SERV_PROV_CODE = CHILD.SERV_PROV_CODE \
        AND ASILIC.B1_PER_ID1     = CHILD.B1_PER_ID1 \
        AND ASILIC.B1_PER_ID2     = CHILD.B1_PER_ID2 \
        AND ASILIC.B1_PER_ID3     = CHILD.B1_PER_ID3 \
        AND ASILIC.B1_CHECKBOX_DESC = 'License Type' \
        AND ASILIC.REC_STATUS = 'A' \
    WHERE PARENT.SERV_PROV_CODE   = '" + aa.getServiceProviderCode() + "' \
        AND PARENT.B1_PER_GROUP    = 'Licenses' \
        AND PARENT.B1_PER_TYPE     = 'Privileged' \
        AND PARENT.B1_PER_SUB_TYPE = 'Gaming' \
        AND PARENT.B1_PER_CATEGORY = 'License' \
        AND PARENT.REC_STATUS      = 'A' \
        AND PARENT.B1_ALT_ID IN (" + inClause + ")";

    var childResults = aa.db.select(childSql, new Array()).getOutput();
    if (!childResults) return;
    childResults = childResults.toArray();

    var childrenByParent = {};
    for (var c in childResults) {
        var row = childResults[c];
        var parentAlt = String(row.get("PARENTLICENSEALTID") || "").trim();
        var childAlt = String(row.get("LICENSEALTID") || "").trim();
        if (!parentAlt || !childAlt || childAlt === "null" || parentAlt === childAlt) continue;

        if (!childrenByParent[parentAlt]) childrenByParent[parentAlt] = [];
        var alreadyListed = false;
        for (var d = 0; d < childrenByParent[parentAlt].length; d++) {
            if (childrenByParent[parentAlt][d].licenseAltId === childAlt) {
                alreadyListed = true;
                break;
            }
        }
        if (alreadyListed) continue;

        childrenByParent[parentAlt].push({
            licenseAltId: childAlt,
            licenseType: String(row.get("LICENSETYPE") || ""),
            businessName: String(row.get("BUSINESSNAME") || ""),
            locationAddress: String(getLicenseLocationAddress(childAlt))
        });
    }

    attachChildLicensesToNodes(parents, childrenByParent);
}

function collectDbaAltIds(nodes, seen) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node) continue;
        var dbaAltId = String(node.dbaAltId || "").trim();
        if (dbaAltId && dbaAltId !== "null") seen[dbaAltId] = true;
        if (node.relatedContacts && node.relatedContacts.length) {
            collectDbaAltIds(node.relatedContacts, seen);
        }
    }
}

function attachPendingApplicationsToNodes(nodes, appsByDba) {
    if (!nodes) return;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (!node) continue;
        var dbaAltId = String(node.dbaAltId || "").trim();
        if (dbaAltId && appsByDba[dbaAltId] && appsByDba[dbaAltId].length > 0) {
            mergePendingApplicationList(node, appsByDba[dbaAltId]);
        }
        if (node.relatedContacts && node.relatedContacts.length) {
            attachPendingApplicationsToNodes(node.relatedContacts, appsByDba);
        }
    }
}

function expandPendingApplications(parents) {
    var seen = {};
    collectDbaAltIds(parents, seen);

    var inClause = "";
    for (var altId in seen) {
        if (!seen.hasOwnProperty(altId)) continue;
        var cleanAlt = String(altId).replace(/[^0-9a-zA-Z\-]/g, "");
        if (cleanAlt === "") continue;
        inClause += (inClause === "" ? "" : ",") + "'" + cleanAlt + "'";
    }
    if (inClause === "") return;

    var appSql = "SELECT DISTINCT \
        DBA.B1_ALT_ID AS DBAALTID, \
        APP.B1_ALT_ID AS APPLICATIONALTID, \
        APP.B1_SPECIAL_TEXT AS BUSINESSNAME, \
        APP.B1_APPL_STATUS AS APPLICATIONSTATUS, \
        ASILIC.B1_CHECKLIST_COMMENT AS APPLICATIONTYPE \
    FROM B1PERMIT DBA \
    INNER JOIN XAPP2REF X \
        ON  X.SERV_PROV_CODE = DBA.SERV_PROV_CODE \
        AND X.B1_MASTER_ID1  = DBA.B1_PER_ID1 \
        AND X.B1_MASTER_ID2  = DBA.B1_PER_ID2 \
        AND X.B1_MASTER_ID3  = DBA.B1_PER_ID3 \
    INNER JOIN B1PERMIT APP \
        ON  APP.SERV_PROV_CODE = X.SERV_PROV_CODE \
        AND APP.B1_PER_ID1     = X.B1_PER_ID1 \
        AND APP.B1_PER_ID2     = X.B1_PER_ID2 \
        AND APP.B1_PER_ID3     = X.B1_PER_ID3 \
        AND APP.B1_PER_CATEGORY = 'Application' \
        AND APP.B1_APPL_STATUS LIKE '%Pending%' \
        AND APP.REC_STATUS      = 'A' \
        AND (APP.B1_PER_ID1 <> DBA.B1_PER_ID1 \
          OR APP.B1_PER_ID2 <> DBA.B1_PER_ID2 \
          OR APP.B1_PER_ID3 <> DBA.B1_PER_ID3) \
    LEFT JOIN BCHCKBOX ASILIC \
        ON  ASILIC.SERV_PROV_CODE = APP.SERV_PROV_CODE \
        AND ASILIC.B1_PER_ID1     = APP.B1_PER_ID1 \
        AND ASILIC.B1_PER_ID2     = APP.B1_PER_ID2 \
        AND ASILIC.B1_PER_ID3     = APP.B1_PER_ID3 \
        AND ASILIC.B1_CHECKBOX_DESC = 'License Type' \
        AND ASILIC.REC_STATUS = 'A' \
    WHERE DBA.SERV_PROV_CODE   = '" + aa.getServiceProviderCode() + "' \
        AND DBA.B1_PER_GROUP    = 'Licenses' \
        AND DBA.B1_PER_TYPE     = 'DBA' \
        AND DBA.REC_STATUS      = 'A' \
        AND DBA.B1_ALT_ID IN (" + inClause + ")";

    var appResults = aa.db.select(appSql, new Array()).getOutput();
    if (!appResults) return;
    appResults = appResults.toArray();

    var appsByDba = {};
    for (var a in appResults) {
        var row = appResults[a];
        var dbaAlt = String(row.get("DBAALTID") || "").trim();
        var appAlt = String(row.get("APPLICATIONALTID") || "").trim();
        if (!dbaAlt || !appAlt || appAlt === "null" || dbaAlt === appAlt) continue;

        if (!appsByDba[dbaAlt]) appsByDba[dbaAlt] = [];
        var alreadyListed = false;
        for (var d = 0; d < appsByDba[dbaAlt].length; d++) {
            if (appsByDba[dbaAlt][d].applicationAltId === appAlt) {
                alreadyListed = true;
                break;
            }
        }
        if (alreadyListed) continue;

        appsByDba[dbaAlt].push({
            applicationAltId: appAlt,
            applicationType: String(row.get("APPLICATIONTYPE") || ""),
            businessName: String(row.get("BUSINESSNAME") || ""),
            applicationStatus: String(row.get("APPLICATIONSTATUS") || ""),
            locationAddress: String(getLicenseLocationAddress(appAlt))
        });
    }

    attachPendingApplicationsToNodes(parents, appsByDba);
}

function getScriptText(vScriptName, servProvCode, useProductScripts) {
    if (!servProvCode)  servProvCode = aa.getServiceProviderCode();
    vScriptName = vScriptName.toUpperCase();
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    try {
        if (useProductScripts) {
            return emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName).getScriptText() + "";
        } else {
            return emseBiz.getScriptByPK(aa.getServiceProviderCode(), vScriptName, "ADMIN").getScriptText() + "";
        }
    } catch (err) {
        return "";
    }
}