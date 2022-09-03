console.log("Entering background script")
import SenderFactory from '/src/sender.js';


const IDEALISTA_KEY = "idealista";
const OLX_KEY = "olx";
const FB_KEY = "fb";

const PAGE_CHECK = "pageCheck";
const PAGE_RELOADED = "pageReload";

const hostPatterns = [
    {key: IDEALISTA_KEY, urlPattern: "*://*.idealista.pt/*"},
    {key: OLX_KEY, urlPattern: "*://*.olx.pt/*"}, 
    {key: FB_KEY, urlPattern: "*://*.facebook.com/*"}
];

let isDebug = false;

let applicationSettings = {}

function loadSettingsAndRun(toRun) {
    chrome.storage.sync.get({
        telegramId: "",
        telegramGroupId: "",
        isSendMessageTelegram: false,
        slackWebhookUrl: "",
        slackMentionUsername: "",
        isSendMessageSlack: false,
        checkPeriod: "10",
        numberOfTabsToCheck: "1",
        isShowNotifications: true,
        iftttEventName: "",
        iftttKey: "",
        isSendIfttt: false,
        isProcessIdealista: true,
        isProcessFb: true,
        isProcessOlx: true,
      }, function(items) {
          applicationSettings = items;
          console.debug("Settings loaded: ");
          console.debug(applicationSettings);
          chrome.storage.local.get({allProcessed: {}}, items => {
              console.debug("Loaded processed items: ");
              console.debug(items);
              applicationSettings.allProcessed = items.allProcessed;
              toRun();
          }); 

      });
}

function initiatePageCheck() {
    const cp = applicationSettings.checkPeriod;
    let intCp = 10;
    if (typeof cp === 'string' || cp instanceof String) {
        intCp = parseInt(cp);
    }
    chrome.alarms.create(PAGE_CHECK, {delayInMinutes: intCp});
    entriesParseRequest();
}
//Adds entity to processed list and sets current timestamp to clear later
function addProcessed(entityList, entity) {
    entityList[entity] = new Date().getTime();
}

//Save processed entries to application settings
function saveProcessed(entryList) {
    console.debug("Saving processed list: ");
    console.debug(entryList);
    chrome.storage.local.set({allProcessed: entryList});
}

// Clears items older than Xh
function clearProcessed(entityList, hours) {
    let curDate = new Date();
    //substracting 10h
    curDate.setHours(curDate.getHours() - hours);
    const tooOldThresholdTimestamp = curDate.getTime();
    let result = {};
    console.debug("Clearing entries older than " + hours + " hours. Threshold date/time is " + new Date(tooOldThresholdTimestamp));
    //Going over list, moving to result only items newer than Xh
    Object.keys(entityList).map(key => {
        const entityTimestamp = entityList[key];
        if (entityTimestamp < tooOldThresholdTimestamp) {
            console.debug("Entity is " + hours + " hours old, removing from watcher :" + key + " " + new Date(entityTimestamp));
        } else {
            result[key] = entityList[key];
        }
    });
    return result;
}

function getUniqueEntries(allProcessed, newEntries) {
    let result = [];
    if (!Object.keys(allProcessed).length) {
        newEntries.forEach(item => addProcessed(allProcessed, item.url));
        console.log("First run, skipping all entries");
        saveProcessed(allProcessed);
        return result;
    }
    allProcessed = clearProcessed(allProcessed, 10)
    
    //Consider listing as old if it is older than check interval * 1.5.
    //In such case entry did not appear in last result but for some reason present here. Probably ad listings are popping up, not interested.
    const tooOldTreshold = new Date(Date.now() - (applicationSettings.checkPeriod * 60 * 1000) * 1.5).valueOf();
    for (let i = 0; i < newEntries.length; i++) {
        let entry = newEntries[i];
           
        const t = entry.postedTimestamp;
        //Probably we just did not bother to parse time of older entries
        if (isDebug) { result.push(entry); isDebug = false; }
        if (t === undefined || t === -1) {
            console.debug(entry.url + " no posting time specified, skipping");
            continue;
        }

        if (t && t < tooOldTreshold) {
            console.debug(entry.url + " too old, skipping");
            console.debug(new Date(t));
            continue;
        }

        if (allProcessed[entry.url]) {
            console.debug("Url " + entry.url + " is already processed. Skipping. ");
            continue;
        }

        addProcessed(allProcessed, entry.url);
        console.debug("Adding entry to be sent:");
        console.debug(entry);
        result.push(entry);
    }
    console.debug("Found unique entries:");
    console.debug(result);
    saveProcessed(allProcessed);

    //TODO Ugly hack to sync global state. Do not use global state!
    applicationSettings.allProcessed = allProcessed;
    return result;
}

function getNoTabsFoundMessage() {
    return "No tabs found to be parsed, returning. Will recheck in " + applicationSettings.checkPeriod + "minutes.";
}

function entriesParseRequest() {
    
    console.debug("Entered entriesParseRequest");
    chrome.alarms.create(PAGE_RELOADED, {delayInMinutes: 1});
    let patternsToCheck = [];
    for (let i = 0; i < hostPatterns.length; i++) {
        let key = hostPatterns[i].key;
        let as = applicationSettings;

        if (!as.isProcessOlx && key === OLX_KEY) {
            console.debug("OLX parsing turned off in settings, skipping.")
            continue;
        }
        if (!as.isProcessIdealista && key === IDEALISTA_KEY) {
            console.debug("Idealista parsing turned off in settings, skipping.")
            continue;
        }
        if (!as.isProcessFb && key === FB_KEY) {
            console.debug("FB parsing turned off in settings, skipping.")
            continue;
        }

        let urlPattern = hostPatterns[i].urlPattern;
        patternsToCheck.push(urlPattern);
        chrome.tabs.query({ url: urlPattern }, function(tabs) {
            console.debug("Before reloading tab");
            if (!tabs || !tabs.length) {
                console.info(getNoTabsFoundMessage());
                return;
            }
            
            for (let i = 0; (i < applicationSettings.numberOfTabsToCheck && i < tabs.length); i++) {
                chrome.tabs.reload(tabs[i].id, {});
            }
        });
    }
    chrome.storage.sync.get({hostPatternsToProcess: []}, settings => {
        let tmp = settings.hostPatternsToProcess.concat(patternsToCheck);
        chrome.storage.sync.set({hostPatternsToProcess: tmp}); 
    });

}

function buildStrFromJson(entry, separator) {
    let result = "";
    for (const jsonLine in entry) {
        let toAdd = entry[jsonLine];
        if (jsonLine == "postedTimestamp") {
            if (null === toAdd || undefined === toAdd || parseInt(toAdd) === NaN || parseInt(toAdd) == -1) {
                toAdd = "N/A";
            } else {
                toAdd = new Date(toAdd)
            }
            
        }
        result += jsonLine + ": " + toAdd + separator;
    }
    return result
}

function processNewEntries(entries) {
    const sender = (new SenderFactory).getSender(applicationSettings);

    entries.forEach(entry => {
        sender.sendMessageIfttt(entry);
        sender.sendMessageTelegram(buildStrFromJson(entry, "%0A"), false);
        sender.sendMessageNotification(buildStrFromJson(entry, "\n"));
        sender.sendMessageSlack(buildStrFromJson(entry, "\n"));
    });   
}

function requestEntriesList(hostPattern) {
    chrome.tabs.query({ url: hostPattern }, function(tabs) {
        console.debug("Tab is reloaded, sending request for parsing");
        console.debug("Found tabs:")
        console.debug(tabs);
        if (!tabs || !tabs.length) {
            console.info(getNoTabsFoundMessage());
            return;
        }
        for (let i = 0; (i < applicationSettings.numberOfTabsToCheck && i < tabs.length); i++) {
            chrome.tabs.sendMessage(tabs[i].id, {"msg": "getEntries"}, function(response) {
                console.debug("Got response from content script");
                console.debug("Got new entries from content script: "); 
                console.debug(response);
                if (!response) { 
                    console.info("No response, returning");
                    return; 
                }
                const data = response.data;
                if (!data || !data.length) {
                    console.info("No result from parser, returning.")
                }
                // Got entries list in json format, checking if there are any new entries 
                const newEntries = getUniqueEntries(applicationSettings.allProcessed, data);

                if (!newEntries || !newEntries.length) { 
                    console.debug("No new entries, returning");
                    return; 
                }
                processNewEntries(newEntries);
            });
        }
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === 'updateSettings') {
        loadSettingsAndRun(initiatePageCheck);
    }
    if (msg === 'testTelegram') {
        const sender = (new SenderFactory()).getSender(applicationSettings);
        sender.sendMessageTelegram("Паляниця", true);
    }
});

chrome.runtime.onInstalled.addListener(details => {
    console.info("Extension install background script onInstalled");
    loadSettingsAndRun(initiatePageCheck); 
});

chrome.runtime.onStartup.addListener(details => {
    console.info("Extension startup background script onStartup");
    loadSettingsAndRun(initiatePageCheck); 
});

chrome.management.onEnabled.addListener(details => {
    console.info("Extension startup background script onEnabled");
    loadSettingsAndRun(initiatePageCheck); 
});

function pageReloadHandler() {
    chrome.storage.sync.get({hostPatternsToProcess: []}, settings => {
        for (let i = 0; i < settings.hostPatternsToProcess.length; i++) {
            requestEntriesList(settings.hostPatternsToProcess[i]);
        }
        chrome.storage.sync.set({hostPatternsToProcess: []});
    });
}

chrome.alarms.onAlarm.addListener(alarm => {
    console.debug("Woke up, starting check. Alarm: " + JSON.stringify(alarm));
    if (alarm.name === PAGE_CHECK) {
        loadSettingsAndRun(initiatePageCheck);
    }
    if (alarm.name === PAGE_RELOADED) {
        loadSettingsAndRun(pageReloadHandler);
    }
});