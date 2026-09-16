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
    //TESTING
//    aa.env.setValue("editArray","[{\"Percent Owned\":\"60\"}]")
//    aa.env.setValue("editRefNbr" , "242058");
//    aa.env.setValue("parentRefNbr", "242056"); 

    var editArray = JSON.parse(aa.env.getValue("editArray"));
    var editRefNbr = aa.env.getValue("editRefNbr");
    var parentReferenceNumber = aa.env.getValue("parentRefNbr")
    messages.push("editRefNbr " + editRefNbr)
    messages.push("parentReferenceNumber " + parentReferenceNumber)
    var refContact = aa.people.createPeopleModel().getOutput().getPeopleModel();
    refContact.setContactSeqNumber(parentReferenceNumber)
    var vPeopleResults = aa.people.getPeopleByPeopleModel(refContact)//.getOutput();
    if(vPeopleResults.getSuccess()){
    	vPeopleResults = vPeopleResults.getOutput();
    	var contactModel = aa.people.getPeople(+parentReferenceNumber).getOutput();
        editContactFieldsByArrCustom(editArray, editRefNbr)
    	var edit = editContactASITRowByRefNbr(contactModel, "BUSINESS OWNERSHIP", editArray, editRefNbr);
    	messages.push("should be addedd succesfully" + edit)
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
function editContactASITRowByRefNbr(contactModel, subGroup, editArray, referenceNbr) {
    var template = contactModel.getTemplate();
    var formGroupsObj = template.getTemplateTables()
    var formGroups = new Array()
    if (formGroupsObj != null) {
       formGroups = formGroupsObj.toArray();
       for (grp in formGroups) {
          var subgroupsObj = formGroups[grp].getSubgroups();
          if (subgroupsObj != null) {
             var subgroups = subgroupsObj.toArray();
             for (sgrp in subgroups) {
                var sgrpName = subgroups[sgrp].getSubgroupName() + "";
                if (sgrpName == subGroup) {
                   var rowsObj = subgroups[sgrp].getRows()
                   if (rowsObj != null) {
                      var rows = rowsObj.toArray();
                      var rowMatches = null;
                      for (var i = 0; i < rows.length; i++) {
                         var fields = rows[i].getValues().toArray();
                         for (var k in fields) {
                             var checkName = fields[k].getFieldName() + "";
                             var checkValue = fields[k].getValue(); 
                             if (checkName == "Reference ID" && checkValue == referenceNbr) {
                                 rowMatches = i;
                                 break;
                             }
                         }
                      }
                      for (var j = 0; j < rows.length; j++) {
                    	  var fields = rows[j].getValues().toArray();
                    	  if (j == rowMatches) {
                    		  for (fld in fields) {
                               	 var fieldName = fields[fld].getFieldName() + "";
                           		 var arrAtInd = editArray[0];
                           		 for(var flddName in arrAtInd){
                                    if (fieldName == flddName) {
                                        fields[fld].setValue(arrAtInd[flddName]);
                                        break;
                                    }
                               	 }
                                }
                                var editRslt = aa.people.editPeople(contactModel);
                                return editRslt.getSuccess();
                    	  }
                      }
                   }
                }
             }
          }
       }
    }
 }

function editContactFieldsByArrCustom(editArray, editReferenceNbr) {
    var editContactModel = aa.people.getPeople(+editReferenceNbr).getOutput();
    var arrAtInd = editArray[0];
    if(arrAtInd["First Name"] != null){
        editContactModel.setFirstName(arrAtInd["First Name"]);  
    }
    if(arrAtInd["Last Name"] != null){
        editContactModel.setLastName(arrAtInd["Last Name"]);
    }
    if(arrAtInd["Entity Name"] != null){
        editContactModel.setBusinessName(arrAtInd["Entity Name"]);
    }
    if(arrAtInd["E-mail"] != null){
        editContactModel.setEmail(arrAtInd["E-mail"]);
    }
    if(arrAtInd["Business Phone"] != null){
        editContactModel.setPhone3(arrAtInd["Business Phone"]);
    }
    if(arrAtInd["Title"] != null){
        if( editContactModel.getContactTypeFlag().toLowerCase() == "organization"){
            var title = arrAtInd["Title"]
            editContactTemplateASI(editContactModel, "Title", title);
        }
    }
    //setBusinessName, setEmail, setContactType, setContactTypeFlag, setPhone3
    var editRslt = aa.people.editPeople(editContactModel);
    return editRslt.getSuccess();
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