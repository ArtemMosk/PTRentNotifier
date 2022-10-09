console.log("entering parserOlx.js")

function getTextByDataTest(parentElement, dataTestAttributeValue) {
    return getTextFromDomElem(parentElement, "[data-test='" + dataTestAttributeValue + "']");
}

function getTextFromDomElems(parentElement, selector, separator) {
    const elems = parentElement.querySelectorAll(selector);
    if (!elems) return "";
    result = "";
    elems.forEach(elem => {
        result += elem.textContent || elem.innerText + separator;
    });
    return result;
}

function getTextFromDomElem(parentElement, selector, elementIdx) {
    elementIdx = elementIdx ? elementIdx : 0;
    const elem = parentElement.querySelectorAll(selector)[elementIdx];
    if (!elem) return "";
    return elem.textContent || elem.innerText
}

function getPostedTimestamp(txtDateTime) {
    result = -1;
    const regex = /(\d+) minute[s]? ago/;
    const found = txtDateTime.match(regex);
    if (found) {
        let d = new Date();
        var MS_PER_MINUTE = 60000;
        result = new Date(d - found[1] * MS_PER_MINUTE).valueOf();
    }
    return result;
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll("#main div[data-testid^='listing-card-']");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];
        let listingItem = entry.querySelector(":scope > div");
        let mainAd = listingItem.querySelectorAll(":scope > a")[1];
        let entryUrl = mainAd.getAttribute("href");
        entryUrl = entryUrl.startsWith("/") ? "https://www.carousell.sg" + entryUrl : entryUrl
        entryUrl = entryUrl.substring(0, entryUrl.indexOf("?"));
        
        let entryTitle = getTextFromDomElems(mainAd, "p", " | ");

        const resultEntry = { description: entryTitle};
        const timestampText = getTextFromDomElem(listingItem.querySelector(":scope > a"), ":scope p", 1);
        resultEntry.postedTimestamp = getPostedTimestamp(timestampText);
        resultEntry.url = entryUrl;
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
