//var result = new Object();
var messages = new Array();
var currentUserID = "ADMIN";
var capId = null;
var showDebug = false;
var debug = "";
var br = "<BR>";
var useAppSpecificGroupName = false;
var enableLogging = aa.env.getValue("enableLogging");
try
{
    SCRIPT_VERSION = '2.1'
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", null, true));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS",null,true));
    eval(getScriptText("INCLUDES_CUSTOM", null, true));

}
catch(e1)
{
    addMessage("problem loading environment " + e1.message);
}
try
{
    //TESTING
//    aa.env.setValue("name", "rf DBA2"); 
//	aa.env.setValue("reference number", "243915"); 

    var result = {
	    owners: []
  	};
    var ownerName = aa.env.getValue("name");
    var referenceNbr = aa.env.getValue("reference number");
    var nvBusinessID = aa.env.getValue("nvBusinessID");
    // Build the base query string
    var sql = "SELECT DISTINCT \
        RC.G1_BUSINESS_NAME AS ownerName, \
        RC.G1_CONTACT_NBR AS referenceNbr, \
        RC.G1_CONTACT_TYPE AS contactType, \
        COALESCE(ADDR_PRIMARY.B1_STR_NAME, ADDR_DBA.B1_STR_NAME) AS contactAddress, \
        COALESCE(ADDR_PRIMARY.B1_SITUS_COUNTRY, ADDR_DBA.B1_SITUS_COUNTRY) AS country, \
        COALESCE(ADDR_PRIMARY.B1_SITUS_CITY, ADDR_DBA.B1_SITUS_CITY) AS city, \
        COALESCE(ADDR_PRIMARY.B1_SITUS_STATE, ADDR_DBA.B1_SITUS_STATE) AS state, \
        COALESCE(ADDR_PRIMARY.B1_SITUS_ZIP, ADDR_DBA.B1_SITUS_ZIP) AS zip, \
        RC.G1_CONTACT_TYPE_FLAG AS ownershipType, \
        RC.G1_EMAIL AS email, \
        RC.G1_PHONE3 AS phone, \
        RC.G1_FEDERAL_EMPLOYER_ID_NUM AS fein, \
        'SSN' AS ssn, \
        GTATTR.FIELD_VALUE AS nvNum \
    FROM G3CONTACT RC \
    LEFT JOIN GTMPL_ATTRIBUTE GTATTR \
        ON GTATTR.SERV_PROV_CODE = RC.SERV_PROV_CODE \
        AND GTATTR.ENTITY_SEQ1 = RC.G1_CONTACT_NBR \
        AND GTATTR.ASI_GROUP_CODE = 'LIC_OENTITY' \
        AND GTATTR.SUBGROUP = 'ENTITY' \
        AND GTATTR.FIELD_NAME = 'State BL Number' \
    LEFT JOIN ( \
        SELECT SERV_PROV_CODE, G1_CONTACT_NBR, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3, \
              ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, G1_CONTACT_NBR ORDER BY B1_PER_ID1) as rn \
        FROM B3CONTACT \
    ) BC \
        ON BC.SERV_PROV_CODE = RC.SERV_PROV_CODE \
        AND BC.G1_CONTACT_NBR = RC.G1_CONTACT_NBR \
        AND BC.rn = 1 \
    LEFT JOIN ( \
        SELECT *, ROW_NUMBER() OVER (PARTITION BY B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 ORDER BY B1_PRIMARY_ADDR_FLG DESC) AS row_num \
        FROM B3ADDRES \
    ) AS ADDR_PRIMARY \
        ON ADDR_PRIMARY.SERV_PROV_CODE = BC.SERV_PROV_CODE \
        AND ADDR_PRIMARY.B1_PER_ID1 = BC.B1_PER_ID1 \
        AND ADDR_PRIMARY.B1_PER_ID2 = BC.B1_PER_ID2 \
        AND ADDR_PRIMARY.B1_PER_ID3 = BC.B1_PER_ID3 \
        AND ADDR_PRIMARY.row_num = 1 \
    LEFT JOIN ( \
        SELECT SERV_PROV_CODE, B1_SPECIAL_TEXT, B1_PER_ID1, B1_PER_ID2, B1_PER_ID3, \
              ROW_NUMBER() OVER (PARTITION BY SERV_PROV_CODE, B1_SPECIAL_TEXT ORDER BY B1_PER_ID1) as rn \
        FROM B1PERMIT \
        WHERE B1_PER_GROUP = 'Licenses' \
          AND B1_PER_TYPE = 'DBA' \
          AND B1_PER_SUB_TYPE = 'NA' \
          AND B1_PER_CATEGORY = 'NA' \
          AND REC_STATUS = 'A' \
    ) B_DBA \
        ON B_DBA.SERV_PROV_CODE = RC.SERV_PROV_CODE \
        AND B_DBA.B1_SPECIAL_TEXT = RC.G1_BUSINESS_NAME \
        AND B_DBA.rn = 1 \
    LEFT JOIN ( \
        SELECT *, ROW_NUMBER() OVER (PARTITION BY B1_PER_ID1, B1_PER_ID2, B1_PER_ID3 ORDER BY B1_PRIMARY_ADDR_FLG DESC) AS row_num \
        FROM B3ADDRES \
    ) AS ADDR_DBA \
        ON ADDR_DBA.SERV_PROV_CODE = B_DBA.SERV_PROV_CODE \
        AND ADDR_DBA.B1_PER_ID1 = B_DBA.B1_PER_ID1 \
        AND ADDR_DBA.B1_PER_ID2 = B_DBA.B1_PER_ID2 \
        AND ADDR_DBA.B1_PER_ID3 = B_DBA.B1_PER_ID3 \
        AND ADDR_DBA.row_num = 1 \
    WHERE RC.SERV_PROV_CODE = '$$SERV_PROV_CODE$$' ";

    if (!matches(ownerName, null, "", undefined)) {
        sql += " AND RC.G1_BUSINESS_NAME LIKE '" + ownerName + "%' "; 
    }
    if (!matches(referenceNbr, null, "", undefined)) {
        sql += " AND RC.G1_CONTACT_NBR = '" + referenceNbr + "' ";
    }
    if (!matches(nvBusinessID, null, "", undefined)) {
        sql += " AND GTATTR.FIELD_VALUE = '" + nvBusinessID + "' ";
    }
    sql = sql.replace("$$SERV_PROV_CODE$$", aa.getServiceProviderCode());
    // aa.print(sql)
    var results = aa.db.select(sql, new Array()).getOutput();
    if (results) {
    results = results.toArray();
    for (var r in results) {
        // Extract data based on the AS aliases defined in the SQL query
        var contactModel = aa.people.getPeople(+results[r].get("referenceNbr")).getOutput();
        aa.print(contactModel)
        var relatedContacts = getRelatedContactsRecursive(contactModel, {});
        result.owners.push({
            ownerName: String(results[r].get("ownerName") || ""),
            referenceNbr: String(results[r].get("referenceNbr") || ""),
            contactType: String(results[r].get("contactType") || ""),
            contactAddress: String(results[r].get("contactAddress") || ""),
            country: String(results[r].get("country") || ""),
            city: String(results[r].get("city") || ""),
            state: String(results[r].get("state") || ""),
            zip: String(results[r].get("zip") || ""),
            ownershipType: String(results[r].get("ownershipType") || ""),
            email: String(results[r].get("email") || ""),
            phone: String(results[r].get("phone") || ""),
            fein: String(results[r].get("fein") || ""),
            ssn: String(results[r].get("ssn") || ""),
            nvBusinessId: String(results[r].get("nvNum") || ""),
            relatedContacts: relatedContacts
        });
    }
    aa.print(JSON.stringify(result))
  }else{
    messages.push("No search Result")
  }
}
catch (err)
{
    aa.env.setValue("returnCode", "-1"); // error
    aa.env.setValue("returnValue", err.message + " on line " + err.lineNumber);
    addMessage(err.message);
}
finally
{
    result.messages = messages;
    aa.env.setValue("returnCode", "1");
    aa.env.setValue("result", result);
}

function logInfo(str)
{
    if (enableLogging == true)
        addMessage(str);
}
function addMessage(str)
{
    messages.push(str);
}
function getScriptText(vScriptName, servProvCode, useProductScripts) {
    if (!servProvCode)  servProvCode = aa.getServiceProviderCode();
    vScriptName = vScriptName.toUpperCase();
    var emseBiz = aa.proxyInvoker.newInstance("com.accela.aa.emse.emse.EMSEBusiness").getOutput();
    try {
        if (useProductScripts) {
            var emseScript = emseBiz.getMasterScript(aa.getServiceProviderCode(), vScriptName);
        } else {
            var emseScript = emseBiz.getScriptByPK(aa.getServiceProviderCode(), vScriptName, "ADMIN");
        }
        return emseScript.getScriptText() + "";
    } catch (err) {
        return "";
    }
}
function getRelatedContactsRecursive(contactModel, visited) {
    if (!visited) visited = {};

    var contactSeq = contactModel.getContactSeqNumber();

    // prevent infinite loops
    if (visited[contactSeq]) {
        return [];
    }
    visited[contactSeq] = true;

    var related = [];

    var contactAsit = loadContactTemplateASIT(contactModel, "BUSINESS OWNERSHIP");
    if (!contactAsit || contactAsit.length === 0) {
        return related;
    }

    for (var c = 0; c < contactAsit.length; c++) {
        var referenceId = contactAsit[c]["Reference ID"];
        if (!referenceId) continue;

        var relatedContactModel = aa.people.getPeople(+referenceId).getOutput();
        if (!relatedContactModel) continue;
        var child = {
            ownerName: contactAsit[c]["Type"] == "Organization" ? contactAsit[c]["Entity Name"] : contactAsit[c]["First Name"] + " " + contactAsit[c]["Last Name"],//relatedContactModel.getBusinessName() || (relatedContactModel.getFirstName() + " " + relatedContactModel.getLastName()),
            contactType: contactAsit[c]["Title"], //relatedContactModel.getContactType(),
            percentage: contactAsit[c]["Percent Owned"],
            status: contactAsit[c]["Status"] || "Active",
            ownershipAddr: contactAsit[c]["Address Line 1"],//"3663 S LAS VEGAS BLVD, LA, NV 89109",
            ownershipType: contactAsit[c]["Type"],//relatedContactModel.getContactTypeFlag(),
            firstName: contactAsit[c]["First Name"],//relatedContactModel.getFirstName(),
            lastName: contactAsit[c]["Last Name"],//relatedContactModel.getLastName(),  
            email: contactAsit[c]["E-mail"],// relatedContactModel.getEmail(),
            phone: contactAsit[c]["Business Phone"],//relatedContactModel.getPhone3(),
            country: contactAsit[c]["Country"],
            city: contactAsit[c]["City"],
            state: contactAsit[c]["State"],
            zip: contactAsit[c]["ZIP Code/Province Postal Code"],
            fein: relatedContactModel.getFein(),
            ssn: "SSN",
            referenceNumber: relatedContactModel.getContactSeqNumber(),
            status: contactAsit[c]["Status"],
            relatedContacts: []
        };

        child.relatedContacts = getRelatedContactsRecursive(
            relatedContactModel,
            visited
        );

        related.push(child);
    }

    return related;
}

function loadContactTemplateASIT(peopMol, vASITSubGroup) {
    var result = new Array()
    var gTemplate = peopMol.getTemplate();
    var entityPKMod = peopMol.getEntityPK();
    if (gTemplate) {
       var formGroupsObj = gTemplate.getTemplateTables();
       var formGroups = new Array()
       if (formGroupsObj != null) {
          formGroups = formGroupsObj.toArray();
          for (grp in formGroups) {
             var subgroupsObj = formGroups[grp].getSubgroups();
             if (subgroupsObj != null) {
                var subgroups = subgroupsObj.toArray();
                for (sgrp in subgroups) {
                   var sgrpName = subgroups[sgrp].getSubgroupName() + "";
                   if (sgrpName == vASITSubGroup) {
                      var rowsObj = subgroups[sgrp].getRows();
                      if (rowsObj != null) {
                         var rows = rowsObj.toArray();
                         for (var i = 0; i < rows.length; i++) {
                            var asitRow = new Array();
                            var fields = rows[i].getValues().toArray();
                            for (fld in fields) {
                               asitRow[fields[fld].getFieldName()] = fields[fld].getValue();
                            }
                            result.push(asitRow)
                         }
                      }
                   }
                }
             }
          }
       }
    }
    return result
 }


function invokeGetters(object) {
    var methods = object.getClass().getMethods();
    aa.print("------invoking methods with namePattern=getXXX()");
    for (x in methods) {
           var method = methods[x];
           if (method.getName().toLowerCase().startsWith("get") && method.getParameterTypes().length == 0) {
        	   aa.print(method.getName() + "() = " + method.invoke(object));
           }
    }
    aa.print("---------xx---------");
}
function printMethods(object) {

	for (x in object.getClass().getMethods()) {
		aa.print(object.getClass().getMethods()[x].getName());
	}
}