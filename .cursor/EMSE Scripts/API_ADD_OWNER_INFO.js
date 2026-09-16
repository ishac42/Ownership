var result = new Object();
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
//  TESTING
//	aa.env.setValue("newAsitArr", "[{\"Business Phone\":\"555-987-6543\",\"Type\":\"Individual\",\"Title\":\"Majority Owner\",\"Percent Owned\":\"60\",\"Entity Name\":\"Acme Holdings LLC\",\"First Name\":\"John\",\"Last Name\":\"Doe\",\"E-mail\":\"john.doe@acme.com\",\"Address Line 1\":\"123 Main St\",\"Unit/Suite/Apt\":\"Suite 400\",\"Country\":\"United States\",\"City\":\"Los Angeles\",\"State\":\"CA\",\"ZIP Code/Province Postal Code\":\"90012\",\"Reference ID\":\"\"}]")
//	aa.env.setValue("parentRefNbr", "242056")

	var asitValues =  JSON.parse(aa.env.getValue("newAsitArr"))
    var fein = aa.env.getValue("fein");
    var ssn = aa.env.getValue("ssn");
    var nameSuffix = aa.env.getValue("nameSuffix");
    var parentReferenceNumber = aa.env.getValue("parentRefNbr")

	aa.print("parentReferenceNumber :: " + parentReferenceNumber)
	var refContact = aa.people.createPeopleModel().getOutput().getPeopleModel();
    refContact.setContactSeqNumber(parentReferenceNumber)
    var vPeopleResults = aa.people.getPeopleByPeopleModel(refContact)//.getOutput();
    if(vPeopleResults.getSuccess()){
    	vPeopleResults = vPeopleResults.getOutput();
    	var currPeopleModel = vPeopleResults[0].getPeopleModel();
    	
    	if(!matches(fein, "", null, undefined))
    		currPeopleModel.setFein(fein);
    	
    	for (var index in asitValues) {
            var peopleModel = aa.people.createPeopleModel().getOutput().getPeopleModel();
            peopleModel.setServiceProviderCode(aa.getServiceProviderCode());
            peopleModel.setFirstName(asitValues[index]["First Name"] + "");
            peopleModel.setLastName(asitValues[index]["Last Name"] + "");
            peopleModel.setBusinessName(asitValues[index]["Entity Name"]);
            peopleModel.setEmail(asitValues[index]["E-mail"]);
            if (!matches(nameSuffix, "", null, undefined))
                peopleModel.setNameSuffix(nameSuffix + "");
            var ownerType = (asitValues[index]["Type"] + "").toLowerCase();
            peopleModel.setContactTypeFlag(ownerType);
            if (ownerType == "organization") {
                peopleModel.setContactType("Business Organization");
            } else {
                peopleModel.setContactType("Individual");
            }
            var refId = comparePeopleClarkco(peopleModel);
            var fvResult = aa.people.getPeopleByPeopleModel(peopleModel);
            if (fvResult.getSuccess()) {
                var fvPeopResult = fvResult.getOutput();
                if(fvPeopResult.length > 0 && refId == null){
                    refId = fvPeopResult[0].getContactSeqNumber();
                }
            }
            if (refId == null) {
                peopleModel.setContactTypeFlag(asitValues[index]["Type"].toLowerCase())
                if(asitValues[index]["Type"].toLowerCase() == "organization"){
                    peopleModel.setContactType("Business Organization");
                    aa.people.createPeople(peopleModel);
                    addContactTemplateASIT(peopleModel, "LIC_OENTITY", "BUSINESS OWNERSHIP", []);
                    var title = asitValues[index]["Title"] ? asitValues[index]["Title"] : ""
                    editContactTemplateASI(peopleModel, "Title", title);
                } else if(asitValues[index]["Type"].toLowerCase() == "individual"){
                    peopleModel.setContactType("Individual");
                    aa.people.createPeople(peopleModel);
                }
                refId = peopleModel.getContactSeqNumber();
            } else {
                if(asitValues[index]["Type"].toLowerCase() == "organization"){
                    var title = asitValues[index]["Title"] ? asitValues[index]["Title"] : "";
                    var pModel = aa.people.getPeople(+refId).getOutput();
                    editContactTemplateASI(pModel, "Title", title);
                }
            }
            asitValues[index]["Reference ID"] = refId; 
        }
    	var contactModel = aa.people.getPeople(+parentReferenceNumber).getOutput();
    	var contactAsit = loadContactTemplateASIT(contactModel, "BUSINESS OWNERSHIP");
    	var combinedAsit = asitValues.concat(contactAsit);
    	//add A row to the ASIT of the contact
        var groupName = "LIC_OENTITY"
        var tableName = "BUSINESS OWNERSHIP"
        var tableValues = combinedAsit
        var template = aa.genericTemplate.getTemplateStructureByGroupName(groupName).getOutput();
        template.setEntityPKModel(currPeopleModel.getEntityPK());
        template.setTemplateForms(contactModel.getTemplate().getTemplateForms())
        if (template != null) {
            var tables = template.getTemplateTables();
            var entityPKMod = template.getEntityPKModel();
            if (tables != null) {
                var groups = tables.toArray();
                for (var grp in groups) {
                    var groupName = groups[grp].getGroupName() + "";
                    var subgroupsObj = groups[grp].getSubgroups();
                    if (subgroupsObj != null) {
                        var subgroups = subgroupsObj.toArray();
                        for (var sgrp in subgroups) {
                            var subgroup = subgroups[sgrp];
                            var sgrpName = subgroup.getSubgroupName() + "";
                            if (sgrpName == tableName) {
                                var rowsList = aa.util.newArrayList();
                                for (var i = 0; i < tableValues.length; i++) {
                                    var row = filterBusinessOwnershipAsitRow(tableValues[i]);

                                    var gtList = aa.util.newArrayList();
                                    for (name in row) {
                                        var gtTableValue = new com.accela.aa.template.field.GenericTemplateTableValue();
                                        gtTableValue.setEntityPKModel(entityPKMod);
                                        gtTableValue.setGroupName(groupName)
                                        gtTableValue.setSubgroupName(sgrpName)
                                        gtTableValue.setFieldName(name);
                                        gtTableValue.setValue(row[name]);
                                        gtTableValue.setRowIndex(i + 1);
                                        gtList.add(gtTableValue);
                                    }
                                    if (name)
                                        var tempRow = new com.accela.aa.template.subgroup.TemplateRow();
                                    tempRow.setValues(gtList);
                                    tempRow.setRowIndex(i);

                                    rowsList.add(tempRow);
                                }
                                subgroup.setRows(rowsList);
                            }
                        }
                    }
                }
            }
        }
        currPeopleModel.setTemplate(template)
        var editRslt = aa.people.editPeople(currPeopleModel);
    }
}
catch (err)
{
	aa.print(err)
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