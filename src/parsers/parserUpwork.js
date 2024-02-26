console.log("entering parser.js")

function getTextByDataTest(parentElement, dataTestAttributeValue) {
    return getTextFromDomElem(parentElement, "[data-test='" + dataTestAttributeValue + "']");
}

function getTextFromDomElem(parentElement, selector) {
    const elem = parentElement.querySelectorAll(selector)[0];
    if (!elem) return "";
    return (elem.textContent || elem.innerText).trim()
}

function getPostedTimestamp(txtDateTime) {
    result = -1;
    const regex = /.*?(\d+) minut/;
    const mins = txtDateTime.match(regex);
    const secs = txtDateTime.match(/(\d+) second/);
    let d = new Date();
    if (mins) {
        d.setMinutes(d.getMinutes() - mins[1]);
        result = d.valueOf();
    } else if (secs) {
        d.setSeconds(d.getSeconds() - secs[1]);
        result = d.valueOf();
    }
    return result;
}

function getQuery() {
    // This regex now accounts for any characters between the domain and the "?" indicating the start of query parameters
    const regex = /.*\?(.+)/;
    const found = window.location.href.match(regex);
    if (found && found.length > 1) {
        // Return the first capturing group, which contains the query parameters
        return found[1];
    } else {
        // Return an empty string or null if no query parameters are found
        return null;
    }
}

function getStrippedTitle() {
    return document.title.replaceAll("Freelance ", "").replaceAll(" Jobs - Upwork", "");
}

function extractJobs() {
    const d = document.all[0];
    const jobList = d.querySelectorAll("[data-test='JobsList'] [data-test='JobTile']");
    const result = []
    for (let i = 0; i < jobList.length; i++) {
        let job = jobList[i];
        let title = job.querySelector("h2 a");

        let jobUrl = title.getAttribute("href");
        let jobTitle = title.innerText || title.textContent
        const resultJob = {url: "https://upwork.com" + jobUrl, title: jobTitle};

        let details = job.querySelectorAll("[data-test='JobTileDetails']")[0];
        resultJob.messageTemplate = ".upwork.com";
        resultJob.query = getQuery();
        resultJob.pageTitle = getStrippedTitle();
        resultJob.jobType = getTextByDataTest(details, "job-type-label");
        resultJob.contractorTier = getTextByDataTest(details, "experience-level");
        resultJob.budget = getTextByDataTest(details, "is-fixed-price").trim();
        resultJob.duration = getTextByDataTest(details, "duration-label");
        let postedOnSpans = d.querySelectorAll("[data-test='JobTileHeader'] small span");

// Check if there are at least two matching <span> elements
        if (postedOnSpans && postedOnSpans.length > 1) {
            // Assign the second <span> to resultJob.postedOn
            resultJob.postedOn = postedOnSpans[1].textContent; // Assuming you want the text content

            // Calculate or retrieve the timestamp based on the content of the second <span>
            resultJob.postedTimestamp = getPostedTimestamp(resultJob.postedOn);
        }
        // resultJob.description = getTextByDataTest(details, "job-description-text");
        const t = details.querySelectorAll(".up-skill-wrapper")[0];
        if (t) {
            resultJob.tags = (t.innerText || t.textContent).replace(/\n/g, " ");
        } else {
            resultJob.tags = "";
        }
        result.push(resultJob);
    }
    return result;
}

function extractJobsTmp() {
    const d = document.all[0];
    const googleResultList = d.querySelectorAll("h3");
    result = [];
    for (let i = 0; i < googleResultList.length; i++) {
        result.push({title: (googleResultList[i].innerText || googleResultList[i].textContent)})
    }
    return result;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Callback before getting jobs request message is: " + request.msg);
    if (request) {
        if (request.msg == "getEntries") {
            const jobs = extractJobs();
            console.log("Extracted jobs:");
            console.log(jobs);
            console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
            sendResponse({data: jobs}); // This response is sent to the message's sender
        }
        return true;
    }
});
