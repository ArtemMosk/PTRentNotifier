console.log("entering parserCasaSapo.js")

function getTextFromDomElem(parentElement, selector) {
    if (Array.isArray(selector)) {
        if (selector.length > 0) {
            return getTextFromDomElem(parentElement, selector[0]) + 
                " " + getTextFromDomElem(parentElement, selector.slice(1));
        } else {
            return "";
        }
    }
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return (elem.textContent || elem.innerText).trim();
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll(".property .property-info-content");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];
        let title = entry.querySelector("a.property-info");

        let entryUrl = "casasapo.pt" + title.getAttribute("href");
        let entryTitile = title.getAttribute("title");
        const resultEntry = {url: entryUrl, title: entryTitile};

        resultEntry.price = getTextFromDomElem(title, ".property-price");
        resultEntry.description = getTextFromDomElem(title, [".property-type", ".property-location", ".property-features"]);
        resultEntry.details = getTextFromDomElem(entry, ".property-description");
        resultEntry.postedTimestamp = null;
        
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
