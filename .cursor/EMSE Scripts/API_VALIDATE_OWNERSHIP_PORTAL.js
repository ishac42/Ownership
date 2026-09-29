/*
 * API_VALIDATE_OWNERSHIP_PORTAL
 *
 * Ownership Portal validation (STR Application + age rules).
 *
 * Input (aa.env):
 *   capId     - record ID from portal URL
 *   dob       - date of birth (YYYY-MM-DD or MM/DD/YYYY), optional if ownerArr is sent
 *   ownerArr  - JSON owner object/array; uses "Type", "Title", "Date of Birth", "E-mail"
 *
 * Short Term Rental Application (Licenses/Regulated/Short Term Rental/Application):
 *   - Individual or Organization contact type allowed
 *   - Ownership entity (Title) = Property Owner only (required, no other values)
 *   - Individual: date of birth required; owner must be at least 18 (hard stop if under 18)
 *   - Organization: date of birth must be empty (DOB field is for Individual only)
 *
 * All records (add and edit):
 *   - Individual: email is required
 *   - Organization: email is optional
 *
 * Non-STR records: no ownership or DOB rules enforced by this script.
 *
 * Output (aa.env result):
 *   blocked  - true when submission must be blocked
 *   message  - error text when blocked (multiple lines joined with \\n); empty when allowed
 *   age      - calculated age, or -1 when DOB is missing/invalid
 *   capId    - cap ID string echoed from input
 */ 

var STR_APPLICATION_RECORD_TYPE = "Licenses/Regulated/Short Term Rental/Application";
var ALLOWED_OWNERSHIP_TITLE = "Property Owner";

var result = {
    blocked: false,
    message: "",
    age: -1,
    capId: ""
};

try {
    SCRIPT_VERSION = "2.1";
    eval(getScriptText("INCLUDES_ACCELA_FUNCTIONS", null, true));
    eval(getScriptText("INCLUDES_ACCELA_GLOBALS", null, true));
    eval(getScriptText("INCLUDES_CUSTOM", null, true));

    capId = null;
    var capIdStr = String(aa.env.getValue("recordID") || "").trim();
    result.capId = capIdStr;

    if (!isEmpty(capIdStr)) {
        capId = aa.cap.getCapID(capIdStr).getOutput();
    }

    var ownerArrRaw = String(aa.env.getValue("ownerArr") || "").trim();
    var ownerData = parseOwnerArr(ownerArrRaw);
    var contactType = getContactType(ownerData);
    var ownershipTitle = getOwnershipTitle(ownerData);

    var dob = String(aa.env.getValue("dob") || "").trim();
    if (isEmpty(dob)) {
        dob = getDobFromOwnerData(ownerData);
    }

    var email = getEmailFromOwnerData(ownerData);

    // STR Application: accumulate all validation failures (message +=)
    if (isShortTermRentalApplication(capId)) {
        if (isEmpty(ownershipTitle)) {
            result.blocked = true;
            result.message += "Ownership type is required. Property Owner is the only type of ownership allowed for Short Term Rental Application records.";
        } else if (ownershipTitle.toLowerCase() !== ALLOWED_OWNERSHIP_TITLE.toLowerCase()) {
            result.blocked = true;
            result.message += "Only Property Owner ownership type is allowed for Short-Term Rental applications.";
        }

        if (isEmpty(contactType)) {
            result.blocked = true;
            if (result.message) result.message += "\n";
            result.message += "Contact type (Individual or Organization) is required.";
        } else if (isIndividualContact(contactType)) {
            if (isEmpty(dob)) {
                result.blocked = true;
                if (result.message) result.message += "\n";
                result.message += "Date of Birth is required.";
            } else {
                var age = calculateAgeFromDob(dob);
                result.age = age;

                if (age < 0) {
                    result.blocked = true;
                    if (result.message) result.message += "\n";
                    result.message += "Date of birth is invalid.";
                } else if (age < 18) {
                    result.blocked = true;
                    if (result.message) result.message += "\n";
                    result.message += "Property Owner must be at least 18 years old.";
                }
            }
        } else if (isOrganizationContact(contactType)) {
            if (!isEmpty(dob)) {
                result.blocked = true;
                if (result.message) result.message += "\n";
                result.message += "Date of birth must be empty for Organization contacts.";
            }
        }
    }

    // Individuals need an email (organizations don't)
    if (isIndividualContact(contactType)) {
        if (isEmpty(email)) {
            result.blocked = true;
            if (result.message) result.message += "\n";
            result.message += "Please enter an email address. Email is required for Individual owners.";
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

function isShortTermRentalApplication(recordCapId) {
    if (!recordCapId) return false;

    var capResult = aa.cap.getCap(recordCapId);
    if (!capResult.getSuccess()) return false;

    var capModel = capResult.getOutput();
    if (!capModel) return false;

    var capType = capModel.getCapType();
    if (!capType) return false;

    var recordType = capType.getGroup() + "/" + capType.getType() + "/" + capType.getSubType() + "/" + capType.getCategory();
    return recordType === STR_APPLICATION_RECORD_TYPE;
}

function parseOwnerArr(ownerArrRaw) {
    if (isEmpty(ownerArrRaw)) return null;

    var parsed = JSON.parse(ownerArrRaw);
    if (parsed && parsed.length && parsed.length > 0) {
        return parsed[0];
    }

    return parsed && typeof parsed === "object" ? parsed : null;
}

function getContactType(ownerData) {
    if (!ownerData || typeof ownerData !== "object") return "";
    return String(ownerData["Type"] || ownerData.ownershipType || "").trim();
}

function isIndividualContact(contactType) {
    return String(contactType || "").trim().toLowerCase() === "individual";
}

function isOrganizationContact(contactType) {
    return String(contactType || "").trim().toLowerCase() === "organization";
}

function getDobFromOwnerData(ownerData) {
    if (!ownerData || typeof ownerData !== "object") return "";
    return String(ownerData["Date of Birth"] || ownerData.dob || "").trim();
}

function getEmailFromOwnerData(ownerData) {
    if (!ownerData || typeof ownerData !== "object") return "";
    return String(ownerData["E-mail"] || ownerData.email || "").trim();
}

function getOwnershipTitle(ownerData) {
    if (!ownerData || typeof ownerData !== "object") return "";
    return String(ownerData["Title"] || ownerData.type || "").trim();
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
