import LogWrapper from '/src/logWrapper.js';
import settings from './src/settings.js';
import templates from './src/templates.js';
import settingsHelper from '/src/settingsHelper.js';
import JobMessageSenderFactory from './src/jobMessageSender.js';
import UrlSettingsManager from './src/urlSettingsManager.js';

const logger = (new LogWrapper()).getLogger("background.js", LogWrapper.logTypes.REMOTE_CONSOLE);
logger.debug("Entering background script");

const PAGE_CHECK = "pageCheck";
const PAGE_RELOADED = "pageReload";
const manifest = chrome.runtime.getManifest();
const contentScripts = manifest['content_scripts'];
const globalParams = settings.globalParams;
const constants = settings.const;

let isDebug = settings.globalParams.isDebug;

// Initialize URL Settings Manager
const urlSettingsManager = new UrlSettingsManager(logger);
urlSettingsManager.initializeTabListeners(globalParams);

function formParsersSettings() {
    const ps = [];
    contentScripts.forEach(contentScript => {
        let match = contentScript.matches[0];
        const purifiedName = settingsHelper.purifyMatchToName(match);
        ps.push(
            {
                'name': purifiedName,
                'match': match, 
                "parse": contentScript.parse_by_default,
                "trackSpecificChange": contentScript.track_specific_change, 
                "visible": contentScript.visible
            }
        );
    });
    return ps;
}

function loadSettingsAndRun(toRun) {
    globalParams.parsersSettings = formParsersSettings();

    templates.loadSenderTemplates(globalParams.parsersSettings, constants.deliveryMethodNames);

    logger.debug("Loaded templates:");
    logger.debug(templates.fileTemplates);

    chrome.storage.sync.get(globalParams, function(items) {
          let applicationSettings = items;
          logger.debug("Settings loaded: ");
          logger.debug(applicationSettings);
          chrome.storage.local.get({allProcessed: {}}, items => {
              logger.debug("Loaded processed items: ");
              logger.debug(items);
              applicationSettings.allProcessed = items.allProcessed;
              toRun(applicationSettings);
          });
      });
}

function initiatePageCheck(applicationSettings) {
    const cp = applicationSettings.checkPeriod;
    let intCp = 10;
    if (typeof cp === 'string' || cp instanceof String) {
        intCp = parseInt(cp);
    }
    chrome.alarms.create(PAGE_CHECK, {delayInMinutes: intCp});
    entriesParseRequest(applicationSettings);
}

//Adds entity to processed list and sets current timestamp to clear later
function addProcessed(entityList, entity) {
    entityList[entity] = new Date().getTime();
}

//Save processed entries to application settings
function saveProcessed(entryList) {
    logger.debug("Saving processed list: ");
    logger.debug(entryList);
    chrome.storage.local.set({allProcessed: entryList});
}

// Clears items older than Xh
function clearProcessed(entityList, hours) {
    let curDate = new Date();
    //substracting 10h
    curDate.setHours(curDate.getHours() - hours);
    const tooOldThresholdTimestamp = curDate.getTime();
    let result = {};
    logger.debug("Clearing entries older than " + hours + " hours. Threshold date/time is " + new Date(tooOldThresholdTimestamp));
    //Going over list, moving to result only items newer than Xh
    Object.keys(entityList).map(key => {
        const entityTimestamp = entityList[key];
        if (entityTimestamp < tooOldThresholdTimestamp) {
            logger.debug("Entity is " + hours + " hours old, removing from watcher :" + key + " " + new Date(entityTimestamp));
        } else {
            result[key] = entityList[key];
        }
    });
    return result;
}

function getUniqueEntries(applicationSettings, allProcessed, newEntries) {
    let result = [];
    if (!Object.keys(allProcessed).length) {
        newEntries.forEach(item => addProcessed(allProcessed, item.url));
        logger.log("First run, skipping all entries");
        saveProcessed(allProcessed);
        return result;
    }
    allProcessed = clearProcessed(allProcessed, 100)
    
    //Consider listing as old if it is older than check interval * 1.7.
    //In such case entry did not appear in last result but for some reason present here. Probably ad listings are popping up, not interested.
    const tooOldTreshold = new Date(Date.now() - (applicationSettings.checkPeriod * 60 * 1000) * 1.8).valueOf();
    for (let i = 0; i < newEntries.length; i++) {
        let entry = newEntries[i];
           
        const t = entry.postedTimestamp;
        //Probably we just did not bother to parse time of older entries
        if (isDebug && i === (newEntries.length - 1) && !result.length) {
            result.push(newEntries[0]); isDebug = false; 
        }
        if (t === undefined || t === -1) {
            logger.debug(entry.url + " no posting time specified, skipping");
            continue;
        }

        if (t && t < tooOldTreshold) {
            logger.debug(entry.url + " too old, skipping");
            logger.debug(new Date(t));
            continue;
        }

        if (allProcessed[entry.url]) {
            logger.debug("Url " + entry.url + " is already processed. Skipping. ");
            continue;
        }

        addProcessed(allProcessed, entry.url);
        logger.debug("Adding entry to be sent:");
        logger.debug(entry);
        result.push(entry);
    }
    logger.debug("Found unique entries:");
    logger.debug(result);
    saveProcessed(allProcessed);

    //TODO Ugly hack to sync global state. Do not use global state!
    applicationSettings.allProcessed = allProcessed;
    return result;
}

function getNoTabsFoundMessage(applicationSettings) {
    return "No tabs found to be parsed, returning. Will recheck in " + applicationSettings.checkPeriod + "minutes.";
}

function entriesParseRequest(applicationSettings) {
    logger.debug("Entered entriesParseRequest");
    chrome.alarms.create(PAGE_RELOADED, {delayInMinutes: 1});
    let as = applicationSettings;

    as.parsersSettings.forEach(contentScript => {
        const match = contentScript.match;
        if (!contentScript.parse) {
            logger.debug(match + " parsing turned off in settings, skipping.")
            return;
        }
        chrome.tabs.query({ url: match }, function(tabs) {
            logger.debug("Before reloading tab");
            if (!tabs || !tabs.length) {
                logger.info(getNoTabsFoundMessage(as));
                return;
            }
            
            for (let i = 0; (i < as.numberOfTabsToCheck && i < tabs.length); i++) {
                chrome.tabs.reload(tabs[i].id, {}, () => {
                    setTimeout(() => {
                        if (isDebug) {
                            loadSettingsAndRun(pageReloadHandler);
                        }
                    }, 5000);
                });
            }
        });
    });
}

function processNewEntries(applicationSettings, entries, task_entity_id) {
    const sender = (new JobMessageSenderFactory()).getJobMessageSender(applicationSettings);
    entries.forEach(entry => {
        entry['entity_id'] = task_entity_id;
        sender.notifyOnJob(entry);
    });   
}

function requestEntriesList(applicationSettings, hostPattern, trackSpecificChange) {
    chrome.tabs.query({ url: hostPattern }, function(tabs) {
        logger.debug("Tab is reloaded, sending request for parsing");
        logger.debug("Found tabs:")
        logger.debug(tabs);
        if (!tabs || !tabs.length) {
            logger.info(getNoTabsFoundMessage(applicationSettings));
            return;
        }
        for (let i = 0; (i < applicationSettings.numberOfTabsToCheck && i < tabs.length); i++) {
            if (trackSpecificChange) {
                chrome.tabs.sendMessage(tabs[i].id, {"msg": "trackChange"}, function(response) {
                    logger.debug("Got response from content script");
                    logger.debug(response);
                    if (!response) { 
                        logger.info("No response, returning");
                        return; 
                    }
                    const data = response.data;
                    if (!data || !data.length) {
                        logger.info("No result from parser, returning.")
                    }
                    const sender = (new JobMessageSenderFactory()).getJobMessageSender(applicationSettings);
                    sender.sendMessageTelegram(data, false);
                });
                continue
            }
            chrome.tabs.sendMessage(tabs[i].id, {"msg": "getEntries"}, function(response) {
                logger.debug("Got response from content script");
                logger.debug("Got new entries from content script: "); 
                logger.debug(response);
                if (!response) { 
                    logger.info("No response, returning");
                    return; 
                }
                const data = response.data;
                if (!data || !data.length) {
                    logger.info("No result from parser, returning.")
                }
                let sender = (new JobMessageSenderFactory()).getJobMessageSender(applicationSettings);

                // Got entries list in json format, checking if there are any new entries 
                const newEntries = getUniqueEntries(applicationSettings, applicationSettings.allProcessed, data);
                let entity_id = applicationSettings.entity_ids[tabs[i].index - 1];
                sender.sendHeartBeat({
                    'status': 'ok',
                    'messagesFetched': data.length,
                    'newEntries': newEntries.length,
                    'entity_id': entity_id,
                    'monitoredUrl': tabs[i].url
                });
                if (!newEntries || !newEntries.length) { 
                    logger.debug("No new entries, returning");
                    return; 
                }
                processNewEntries(applicationSettings, newEntries, entity_id);
            });
        }
    });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === 'updateSettings') {
        loadSettingsAndRun(initiatePageCheck);
    }
    if (msg === 'testTelegram') {
        loadSettingsAndRun((applicationSettings) => {
            const sender = (new JobMessageSenderFactory()).getJobMessageSender(applicationSettings);
            sender.sendMessageTelegram("Паляниця", true);
        });
    }
    if (msg === 'forceRun') {
        loadSettingsAndRun(pageReloadHandler);
    }
});

chrome.runtime.onInstalled.addListener(details => {
    logger.info("Extension install background script onInstalled");
    urlSettingsManager.checkConfigTabs();
    loadSettingsAndRun(initiatePageCheck);
});

self.addEventListener('install', () => {
    logger.info("On install");
});

chrome.runtime.onStartup.addListener(details => {
    logger.info("Extension startup background script onStartup");
    urlSettingsManager.checkConfigTabs();
    loadSettingsAndRun(initiatePageCheck);
});

chrome.management.onEnabled.addListener(details => {
    logger.info("Extension startup background script onEnabled");
    urlSettingsManager.checkConfigTabs();
    loadSettingsAndRun(initiatePageCheck);
});

function pageReloadHandler(applicationSettings) {
    applicationSettings.parsersSettings.forEach(contentScript => {
        if (!contentScript.parse) return;
        requestEntriesList(applicationSettings, contentScript.match, contentScript.trackSpecificChange);
    });
}

chrome.alarms.onAlarm.addListener(alarm => {
    logger.debug("Woke up, starting check. Alarm: " + JSON.stringify(alarm));
    if (alarm.name === PAGE_CHECK) {
        loadSettingsAndRun(initiatePageCheck);
    }
    if (alarm.name === PAGE_RELOADED) {
        loadSettingsAndRun(pageReloadHandler);
    }
});
