/*
 * API_DEACTIVATE_OWNER_CONTACT
 * CLARK-4145 — Inactivate an ownership contact by reference number.
 *
 * Deploy in Accela SUPP as a Script/API script with this exact name.
 *
 * Construct API POST body:
 *   { "referenceNbr": "12345" }
 *
 * Sets contact audit status to "I" (Inactive).
 */

var SCRIPT_NAME = "API_DEACTIVATE_OWNER_CONTACT";

function buildResult(success, referenceNbr, message) {
    return {
        success: success,
        referenceNbr: referenceNbr || "",
        status: success ? "Inactive" : "",
        messages: message ? [String(message)] : []
    };
}

function finish(result) {
    var json = JSON.stringify(result);
    aa.print(json);
    aa.env.setValue("ScriptReturnCode", result.success ? "0" : "1");
    aa.env.setValue("ScriptReturnMessage", json);
}

try {
    var referenceNbr = aa.env.getValue("referenceNbr");

    if (!referenceNbr || String(referenceNbr).trim() === "") {
        finish(buildResult(false, referenceNbr, "referenceNbr is required."));
    } else {
        var refNum = parseInt(String(referenceNbr).replace(/[^\d-]/g, ""), 10);

        if (isNaN(refNum) || refNum <= 0) {
            finish(buildResult(false, referenceNbr, "referenceNbr must be a valid numeric contact ID."));
        } else {
            var peopleResult = aa.people.getPeople(refNum);

            if (!peopleResult.getSuccess()) {
                finish(buildResult(
                    false,
                    referenceNbr,
                    "Contact not found for reference number " + referenceNbr + ": " + peopleResult.getErrorMessage()
                ));
            } else {
                var contactModel = peopleResult.getOutput();

                if (!contactModel) {
                    finish(buildResult(false, referenceNbr, "Contact model was empty for reference number " + referenceNbr + "."));
                } else {
                    contactModel.setAuditStatus("I");
                    var editRslt = aa.people.editPeople(contactModel);

                    if (editRslt.getSuccess()) {
                        finish(buildResult(true, referenceNbr, "Contact inactivated successfully."));
                    } else {
                        finish(buildResult(
                            false,
                            referenceNbr,
                            "Failed to inactivate contact: " + editRslt.getErrorMessage()
                        ));
                    }
                }
            }
        }
    }
} catch (err) {
    aa.print(SCRIPT_NAME + " error: " + err);
    finish(buildResult(false, aa.env.getValue("referenceNbr"), err));
}
