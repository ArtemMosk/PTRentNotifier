console.log("entering parserOlx.js")

function getTextByDataTest(parentElement, dataTestAttributeValue) {
    return getTextFromDomElem(parentElement, "[data-test='" + dataTestAttributeValue + "']");
}

function getTextFromDomElem(parentElement, selector) {
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return elem.textContent || elem.innerText
}

function getPostedTimestamp(txtDateTime, timeSearchRegex) {
    result = -1;
    const regex = timeSearchRegex;
    const found = txtDateTime.match(regex);
    if (found) {
        let d = new Date();
        d.setHours(found[1]);
        d.setMinutes(found[2]);
        result = d.valueOf();
    }
    return result;
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll("[data-cy='l-card']");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];
        let listingItem = entry.querySelector(":scope > a");

        let entryUrl = listingItem.getAttribute("href");
        entryUrl = entryUrl.startsWith("/") ? "https://olx.pt" + entryUrl : entryUrl
        
        let entryTitle = getTextFromDomElem(listingItem, "h6");

        const resultEntry = {url: entryUrl, title: entryTitle};

        resultEntry.price = getTextFromDomElem(listingItem, "[data-testid='ad-price']");
        resultEntry.details = getTextFromDomElem(listingItem, "[data-testid='location-date']");
        resultEntry.postedTimestamp = getPostedTimestamp(resultEntry.details, /Hoje às (\d\d):(\d\d)/);
        if (resultEntry.postedTimestamp == -1) {
            resultEntry.postedTimestamp = getPostedTimestamp(resultEntry.details, /Today at (\d\d):(\d\d)/);
        }
        result.push(resultEntry);
    }
    return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.debug("Callback before getting entries request message is: " + request.msg);
    if(request) {
        if (request.msg == "getEntries") {
            const entries = extractEntries();
            console.debug("Extracted entries:");
            console.debug(entries);
            console.debug(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
            sendResponse({ data: entries }); // This response is sent to the message's sender 
        }
        return true;
    }
});
