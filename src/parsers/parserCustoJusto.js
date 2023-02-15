console.log("entering parserCustoJusto.js")

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
    const entriesList = d.querySelectorAll(".container_related a");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];

        let entryUrl = entry.getAttribute("href");
        entryUrl = entryUrl.startsWith("http") ? entryUrl : "casasapo.pt" + entryUrl;
        let entryTitile = getTextFromDomElem(entry, "h2");
        const resultEntry = {url: entryUrl, title: entryTitile};

        resultEntry.price = getTextFromDomElem(entry, "h5");
        resultEntry.description = getTextFromDomElem(entry, [".location_related", ".description_related"]);
        resultEntry.details = getTextFromDomElem(entry, ".norelative span:not(.time, .day-hour)");
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
