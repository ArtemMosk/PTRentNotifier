console.log("entering parserIdealista.js")

function getTextByDataTest(parentElement, dataTestAttributeValue) {
    return getTextFromDomElem(parentElement, "[data-test='" + dataTestAttributeValue + "']");
}

function getTextFromDomElem(parentElement, selector) {
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return elem.textContent || elem.innerText
}

function getPostedTimestamp(txtDateTime) {
    result = -1;
    const regex = /(\d+) minut/;
    const found = txtDateTime.match(regex);
    if (found) {
        let d = new Date();
        d.setMinutes(d.getMinutes() - found[1]);

        result = d.valueOf();
    }
    return result;
}

function extractEntries() {
    const d = document.all[0];
    const entriesList = d.querySelectorAll(".items-container .item");
    const result = []
    for (let i = 0; i < entriesList.length; i++) {
        let entry = entriesList[i];
        let title = entry.querySelector(".item-info-container a.item-link");

        let entryUrl = title.getAttribute("href");
        let entryTitile = title.innerText || title.textContent
        const resultEntry = {url: "https://idealista.pt" + entryUrl, title: entryTitile};

        let info = entry.querySelectorAll(".item-info-container")[0];
        resultEntry.price = getTextFromDomElem(info, ".item-price");
        resultEntry.description = getTextFromDomElem(info, ".item-description");
        resultEntry.details = getTextFromDomElem(info, ".item-detail-char");
        const time = getTextFromDomElem(info, ".item-detail-char .txt-highlight-red")
        resultEntry.postedTimestamp = getPostedTimestamp(resultEntry.details);
        
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
