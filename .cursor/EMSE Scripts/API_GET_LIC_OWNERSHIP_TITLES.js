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
    // Ownership portal ref data: titles (entity/ownership type), address types, professional types
    result = {
        titles: getBizDomainValues("LIC_Ownership_Titles"),
        addresses: getBizDomainValues("LIC_OWNERSHIP_ADDRESSES"),
        professionals: getBizDomainValues("LIC_OWNERSHIP_PROFESSIONALS"),
        // Backward-compatible alias used by older clients
        values: []
    };
    result.values = result.titles;
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

/**
 * Reads an Accela standard choice (biz domain) into [{ value, description }, ...]
 */
function getBizDomainValues(domainName) {
    var values = [];
    var bizDomain = aa.bizDomain.getBizDomain(domainName);

    if (!bizDomain.getSuccess()) {
        addMessage("Failed to load biz domain: " + domainName + " — " + bizDomain.getErrorMessage());
        return values;
    }

    var bizDomainArray = bizDomain.getOutput().toArray();
    for (var b = 0; b < bizDomainArray.length; b++) {
        var item = bizDomainArray[b];
        values.push({
            value: String(item.getBizdomainValue()),
            description: String(item.getDescription() || item.getBizdomainValue())
        });
    }
    return values;
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
