console.log("entering parser.js")

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

function extractJobs() {
    const d = document.all[0];
    const jobList = d.querySelectorAll("[data-test='job-tile-list'] .up-card-section");
    const result = []
    for (let i = 0; i < jobList.length; i++) {
        let job = jobList[i];
        let title = job.querySelector(".job-tile-title a");

        let jobUrl = title.getAttribute("href");
        let jobTitle = title.innerText || title.textContent
        const resultJob = {url: "https://upwork.com" + jobUrl, title: jobTitle};

        let details = job.querySelectorAll("[data-test='JobTileFeatures'")[0];
        resultJob.jobType = getTextByDataTest(details, "job-type");
        resultJob.contractorTier = getTextByDataTest(details, "contractor-tier");
        resultJob.budget = getTextByDataTest(details, "budget");
        resultJob.duration = getTextByDataTest(details, "duration");
        resultJob.postedOn = getTextByDataTest(details, "posted-on");
        resultJob.postedTimestamp = getPostedTimestamp(resultJob.postedOn)
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
    if(request) {
        if (request.msg == "getEntries") {
            const jobs = extractJobs();
            console.log("Extracted jobs:");
            console.log(jobs);
            console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
            sendResponse({ data: jobs }); // This response is sent to the message's sender 
        }
        return true;
    }
});
