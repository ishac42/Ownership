/*
 * API_VALIDATE_OWNERSHIP_PORTAL
 *
 * Age-only validation for the Ownership Portal.
 *
 * Input (aa.env):
 *   dob       - date of birth (YYYY-MM-DD or MM/DD/YYYY), optional if ownerArr is sent
 *   ownerArr  - optional JSON owner object/array; uses "Date of Birth" when present
 *
 * Output (aa.env result):
 *   blocked  - true when submission must be blocked (owner is under 18)
 *   message  - error text when blocked; empty when allowed
 *   age      - calculated age, or -1 when DOB is missing/invalid
 */

var result = {
    blocked: false,
    message: "",
    age: -1
};

try {
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", null, true));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS", null, true));
    eval(getScriptText("INCLUDES_CUSTOM", null, true));
} catch (loadErr) {
    // Continue without includes when running in isolation
}

try {
    var dob = String(aa.env.getValue("dob") || "").trim();
    if (isEmpty(dob)) {
        dob = getDobFromOwnerArr(String(aa.env.getValue("ownerArr") || "").trim());
    }

    if (!isEmpty(dob)) {
        var age = calculateAgeFromDob(dob);
        result.age = age;

        if (age >= 0 && age < 18) {
            result.blocked = true;
            result.message = "Property Owner must be at least 18 years old.";
        }
    }
} catch (err) {
    aa.env.setValue("returnCode", "-1");
    aa.env.setValue("returnValue", err.message + " on line " + err.lineNumber);
    result.blocked = true;
    result.message = err.message;
} finally {
    aa.env.setValue("returnCode", result.blocked ? "0" : "1");
    aa.env.setValue("result", result);
}

function getDobFromOwnerArr(ownerArrRaw) {
    if (isEmpty(ownerArrRaw)) return "";

    var parsed = JSON.parse(ownerArrRaw);
    var ownerData = parsed;

    if (parsed && parsed.length && parsed.length > 0) {
        ownerData = parsed[0];
    }

    if (!ownerData || typeof ownerData !== "object") return "";

    return String(ownerData["Date of Birth"] || ownerData.dob || "").trim();
}

function calculateAgeFromDob(dobStr) {
    var dob = parseDob(dobStr);
    if (!dob) return -1;

    var today = new Date();
    var age = today.getFullYear() - dob.getFullYear();
    var monthDiff = today.getMonth() - dob.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }

    return age;
}

function parseDob(dobStr) {
    var trimmed = String(dobStr).trim();

    var isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
        return new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }

    var usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
        return new Date(parseInt(usMatch[3], 10), parseInt(usMatch[1], 10) - 1, parseInt(usMatch[2], 10));
    }

    var parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }

    return null;
}

function isEmpty(str) {
    return str === null || str === undefined || String(str).trim() === "";
}

function getScriptText(vScriptName, servProvCode, useProductScripts) {
    if (!servProvCode) servProvCode = aa.getServiceProviderCode();
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
