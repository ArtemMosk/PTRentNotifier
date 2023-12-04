console.log("entering parserArbitrum.js")


function extractEntries() {
    const d = document.all[0];
    const error = d.querySelectorAll(".devinfo-container .error-code").innerHTML;
    let node = document.querySelectorAll(".devinfo-container .error-code strong");
    if (node.length) {
        let errorCode = node[0].innerHTML
        return "ELEMENT_PRESENT"
    } else {
        return "ELEMENT_ABSENT" 
    }
    return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.debug("Callback before getting entries request message is: " + request.msg);
    if(request) {
        if (request.msg == "trackChange") {
            const res = extractEntries();
            console.debug(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
            sendResponse({ data: res }); 
        }
        return true;
    }
});
