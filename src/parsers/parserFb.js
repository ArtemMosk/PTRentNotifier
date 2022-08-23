console.log("entering parserFb.js")

function getTextFromDomElem(parentElement, selector) {
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return elem.textContent || elem.innerText
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll("a[role='link'][tabindex='0'][href*='marketplace/item']");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];

        let entryUrl = location.hostname + entry.getAttribute("href");
        if (entryUrl.indexOf("?") > -1) {
            entryUrl = entryUrl.substr(0, entryUrl.indexOf("?"));
        }

        let listingItem = entry.querySelector(":scope > div > div:nth-child(2)");

        let entryTitle = getTextFromDomElem(listingItem, ":scope>div:nth-child(2)");

        const resultEntry = {url: entryUrl, title: entryTitle};

        resultEntry.price = getTextFromDomElem(listingItem, ":scope>div:nth-child(1)");
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
