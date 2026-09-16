function comparePeopleClarkco(ipPeop) {

    // This function uses the close match criteria stored in the

    // INDIVIDUAL_CONTACT_MATCH_CRITERIA and ORGANIZATION_CONTACT_MATCH_CRITERIA standard choices

    // to check the reference contact library for potential duplicate contacts.

    // The function takes a single peopleModel as a parameter, and will return an array of people models (peopResult)

    // Function returns null if there are no matches found

    var nvBusinessNum = "";

    if(arguments.length > 1) {

        nvBusinessNum = arguments[1];

    }

    if(!matches(nvBusinessNum, "", undefined, null) && ipPeop.getContactTypeFlag().toLowerCase() == "organization")

        return getRefContactByNVBusinessID(nvBusinessNum);



    var fvContType = ipPeop.getContactType();



    var fvCriteriaStdChoice = "INDIVIDUAL_CONTACT_MATCH_CRITERIA";

    // default to individual unless flag is Org

    if (fvContType == "Organization") {

        fvCriteriaStdChoice = "ORGANIZATION_CONTACT_MATCH_CRITERIA";

    }

    if (lookup("REF_CONTACT_CREATION_RULES", fvContType) == "O") {

        fvCriteriaStdChoice = "ORGANIZATION_CONTACT_MATCH_CRITERIA";

    }



    //Add agency specific logic here if needed

    // Clark County Ownership Portal — try portal match criteria before standard choices

    var fvClarkCriteriaStrings = [];

    var fvIsOrganization = (fvContType == "Organization" || fvContType == "Business Organization"

        || lookup("REF_CONTACT_CREATION_RULES", fvContType) == "O"

        || (ipPeop.getContactTypeFlag() + "").toLowerCase() == "organization");

    if (fvIsOrganization) {

        fvClarkCriteriaStrings.push("businessName");

    } else {

        fvClarkCriteriaStrings.push("firstName;lastName;nameSuffix;email");

    }

    var fvClarkMatch = searchRefContactByCriteria(fvClarkCriteriaStrings, ipPeop);

    if (fvClarkMatch != null)

        return fvClarkMatch;



    var fvBizDomainSR = aa.bizDomain.getBizDomain(fvCriteriaStdChoice);

    if (!fvBizDomainSR || !fvBizDomainSR.getSuccess()) {

        logDebug("Standard Choice '" + fvCriteriaStdChoice + "' not defined.");

        return null;

    }

    var fvBizDomain = fvBizDomainSR.getOutput();

    if (!fvBizDomain || fvBizDomain.size() == 0) {

        logDebug("No criteria defined in Standard Choice '" + fvCriteriaStdChoice + "'.");

        return null;

    }



    for (var fvCounter1 = 0; fvCounter1 < fvBizDomain.size(); fvCounter1++) {

        var fvCloseMatchCriteriaObj = fvBizDomain.get(fvCounter1);

        var fvCriteriaStr = fvCloseMatchCriteriaObj.getDispBizdomainValue();

        if (!fvCriteriaStr || fvCriteriaStr == "")

            continue;



        var fvPeop = aa.people.createPeopleModel().getOutput().getPeopleModel();



        var fvCriteriaArr = fvCriteriaStr.split(";");



        var fvSkipThisCriteria = false;

        for ( var fvCounter2 in fvCriteriaArr) {

            var fvCriteriaFld = fvCriteriaArr[fvCounter2];

            if (ipPeop[fvCriteriaFld] == null) {

                fvSkipThisCriteria = true;

                logDebug("Value for " + fvCriteriaFld + " is null.");

                break;

            }

            fvPeop[fvCriteriaFld] = ipPeop[fvCriteriaFld];

            logDebug("Search for " + fvCriteriaFld + " " + fvPeop[fvCriteriaFld]);

        }



        if (fvSkipThisCriteria) {

            logDebug("WARNING: One or more Values for the Fields defined in this Criteria are null. Skipping this criteria.");

            continue;

        }



        var fvResult = aa.people.getPeopleByPeopleModel(fvPeop);

        if (!fvResult.getSuccess()) {

            logDebug("WARNING: Error searching for duplicate contacts : " + fvResult.getErrorMessage());

            continue;

        }



        var fvPeopResult = fvResult.getOutput();

        if (fvPeopResult.length == 0) {

            logDebug("Searched for Reference Contact, no matches found.");

            continue;

        }



        if (fvPeopResult.length > 0) {

            logDebug("Searched for a Reference Contact, " + fvPeopResult.length + " matches found! Returning the first match : " + fvPeopResult[0].getContactSeqNumber());

            return fvPeopResult[0].getContactSeqNumber();

        }

    }

    logDebug("No matches found. Returning Null.");

    return null;

}



function searchRefContactByCriteria(ipCriteriaStrings, ipPeop) {

    for (var fvCounter1 = 0; fvCounter1 < ipCriteriaStrings.length; fvCounter1++) {

        var fvCriteriaStr = ipCriteriaStrings[fvCounter1];

        if (!fvCriteriaStr || fvCriteriaStr == "")

            continue;



        var fvPeop = aa.people.createPeopleModel().getOutput().getPeopleModel();

        var fvCriteriaArr = fvCriteriaStr.split(";");

        var fvSkipThisCriteria = false;



        for (var fvCounter2 in fvCriteriaArr) {

            var fvCriteriaFld = fvCriteriaArr[fvCounter2];

            if (ipPeop[fvCriteriaFld] == null) {

                fvSkipThisCriteria = true;

                logDebug("Value for " + fvCriteriaFld + " is null.");

                break;

            }

            fvPeop[fvCriteriaFld] = ipPeop[fvCriteriaFld];

            logDebug("Search for " + fvCriteriaFld + " " + fvPeop[fvCriteriaFld]);

        }



        if (fvSkipThisCriteria) {

            logDebug("WARNING: One or more Values for the Fields defined in this Criteria are null. Skipping this criteria.");

            continue;

        }



        var fvResult = aa.people.getPeopleByPeopleModel(fvPeop);

        if (!fvResult.getSuccess()) {

            logDebug("WARNING: Error searching for duplicate contacts : " + fvResult.getErrorMessage());

            continue;

        }



        var fvPeopResult = fvResult.getOutput();

        if (fvPeopResult.length == 0) {

            logDebug("Searched for Reference Contact, no matches found.");

            continue;

        }



        if (fvPeopResult.length > 0) {

            logDebug("Searched for a Reference Contact, " + fvPeopResult.length + " matches found! Returning the first match : " + fvPeopResult[0].getContactSeqNumber());

            return fvPeopResult[0].getContactSeqNumber();

        }

    }

    return null;

}

