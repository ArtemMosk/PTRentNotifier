console.log("entering parserImovirtual.js")

function getTextFromDomElem(parentElement, selector) {
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return elem.textContent || elem.innerText
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll(".offer-item .offer-item-details");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];
        let title = entry.querySelector(".offer-item-header>h3 a");

        let entryUrl = title.getAttribute("href");
        let entryTitile = title.innerText || title.textContent
        const resultEntry = {url: "https://imovirtual.com/" + entryUrl, title: entryTitile};

        let info = entry.querySelectorAll(".params")[0];
        resultEntry.price = getTextFromDomElem(info, ".offer-item-price");
        resultEntry.description = getTextFromDomElem(info, ".offer-item-area");
        resultEntry.details = getTextFromDomElem(info, ".offer-item-rooms");
        const time = getTextFromDomElem(info, ".item-detail-char .txt-highlight-red");
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
