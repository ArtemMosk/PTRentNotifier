console.log("Entering background script")
const IDEALISTA_KEY = "idealista";
const OLX_KEY = "olx";
const FB_KEY = "fb";

let parseIntervalId = 0;
const hostPatterns = [
    {key: IDEALISTA_KEY, urlPattern: "*://*.idealista.pt/*"},
    {key: OLX_KEY, urlPattern: "*://*.olx.pt/*"}, 
    {key: FB_KEY, urlPattern: "*://*.facebook.com/*"}
];

let isDebug = false;

const allProcessed = new Set();
let applicationSettings = {}

function loadSettings() {
    chrome.storage.sync.get({
        telegramId: "",
        telegramGroupId: "",
        isSendMessageTelegram: false,
        slackWebhookUrl: "",
        slackMentionUsername: "",
        isSendMessageSlack: false,
        checkPeriod: "10",
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
          initiatePageCheck();
      });
}

function initiatePageCheck() {
    entriesParseRequest();

    if (parseIntervalId) {
        clearInterval(parseIntervalId);
    }
    parseIntervalId = setInterval(entriesParseRequest, applicationSettings.checkPeriod * 60 * 1000);
}

function sendMessageTelegram(message) {
    if (!applicationSettings.isSendMessageTelegram) {
        console.debug("Telegram is turned off, skipping send");
        return;
    }
    var token = applicationSettings.telegramId;
    var chat_id = applicationSettings.telegramGroupId;
    if (!token || !chat_id) {
        console.info("Telegram token or chat ID not specified, skipping sending to Telegram. ");
        return;
    }
    var url = 'https://api.telegram.org/bot' + token + '/sendMessage?chat_id=' + chat_id + '&text=' + message + '&parse_mode=html';
    console.debug("Sending message " + url);
    
    fetch(url);
}

function sendMessageNotification(message) {
    if (!applicationSettings.isShowNotifications) {
        console.debug("Notifications are turned off, skipping popup");
        return;
    }
    chrome.notifications.create('', {
        title: "Оновлення фонової сторінки",
        message: message,
        iconUrl: '/src/vendor/img/keyhole64_b.png',
        type: 'basic'
      });
}

function sendMessageIfttt(messageJson) {
    if (!applicationSettings.isSendIfttt) {
        console.debug("IFTTT is turned off, skipping send");
        return;
    }

    const key = applicationSettings.iftttKey;
    if (!key) {
        console.info("IFTTT key is not specified, skipping send to IFTTT.");
        return;
    }

    let url = "https://maker.ifttt.com/trigger/" + applicationSettings.iftttEventName +"/json/with/key/" + key;
    var formBody = [];
    for (var property in messageJson) {
        var encodedKey = encodeURIComponent(property);
        var encodedValue = encodeURIComponent(messageJson[property]);
        formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    console.debug("Sending message " + url);
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        body: formBody
    }).catch(error => {
        console.warn("CORS raising error but IFTT should still receive message. If it does not check key and event name.");
    });
}

function sendMessageSlack(message) {
    if (!applicationSettings.isSendMessageSlack) {
        console.debug("Slack is turned off, skipping send");
        return;
    }

    const url = applicationSettings.slackWebhookUrl;
    if (!url) {
        console.info("Slack webhook url is not specified, skipping send to slack.");
        return;
    }
    
    const smu = applicationSettings.slackMentionUsername ?  "<@" + applicationSettings.slackMentionUsername.replace(/@/g, "") + ">" : ""
    const channelName = "#" + applicationSettings.slackChannelName.replace(/[#@]/g, "");
    const slackMentionUsername = smu;

    console.debug("Sending message " + url);
    let escMessage = escapeSpecialChars(message);

    fetch(url, {
        method: 'POST',
        body: "{\"channel\": \"" + channelName + "\", \"username\": \"upParser\", \"text\": \"" + slackMentionUsername + escMessage +"\", \"icon_emoji\": \":ghost:\"}"
    }).catch(error => {
        console.warn("Can't send message to slack. Please check webhook URL");
        //console.debug(error);
    });
}

function escapeSpecialChars(str) {
    return str.replace(/\\n/g, "\\n")
               .replace(/\\'/g, "\\'")
               .replace(/\\"/g, '\\"')
               .replace(/\\&/g, "\\&")
               .replace(/\\r/g, "\\r")
               .replace(/\\t/g, "\\t")
               .replace(/\\b/g, "\\b")
               .replace(/"/g, "'")
               .replace(/\\f/g, "\\f");
};

function getUniqueEntries(newEntries) {
    let result = [];
    if (!allProcessed.size) {
        newEntries.forEach(item => allProcessed.add(item.url));
        console.log("First run, skipping all entries");
        return result;
    }
    
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

        if (allProcessed.has(entry.url)) {
            console.debug("Url " + entry.url + " is already processed. Skipping. ");
            continue;
        }

        allProcessed.add(entry.url);
        result.push(entry);
    }
    console.log("Found unique entries:");
    console.log(result);
    return result;
}

function getNoTabsFoundMessage() {
    return "No tabs found to be parsed, returning. Will recheck in " + applicationSettings.checkPeriod + "minutes.";
}

function entriesParseRequest() {
  console.debug("Entered entriesParseRequest");

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
    chrome.tabs.query({ url: urlPattern }, function(tabs) {
        console.debug("Before reloading tab");
        if (!tabs || !tabs.length) {
            console.info(getNoTabsFoundMessage());
            return;
        }
        //additional function to pass hostPattern to callback
        function requestEntriesListCaller() {
            requestEntriesList(urlPattern);
        }
        chrome.tabs.reload(tabs[0].id, {}, requestEntriesListCaller);
    });
  }
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
    entries.forEach(entry => {
        sendMessageIfttt(entry);
        sendMessageTelegram(buildStrFromJson(entry, "%0A"));
        sendMessageNotification(buildStrFromJson(entry, "\n"));
        sendMessageSlack(buildStrFromJson(entry, "\n"));
    });   
}

function requestEntriesList(hostPattern) {
    setTimeout(function() {
        chrome.tabs.query({ url: hostPattern }, function(tabs) {
            console.debug("Tab is reloaded, sending request for parsing");
            console.debug("Found tabs:")
            console.debug(tabs);
            if (!tabs || !tabs.length) {
                console.info(getNoTabsFoundMessage());
                return;
            }
            chrome.tabs.sendMessage(tabs[0].id, {"msg": "getEntries"}, function(response) {
                console.debug("Got response from content script");
                console.debug("Got new entries from content script " + JSON.stringify(response, null, "\t"));
                if (!response) { 
                    console.info("No response, returning");
                    return; 
                }
                const data = response.data;
                if (!data || !data.length) {
                    console.info("No result from parser, returning.")
                }
                // Got entries list in json format, checking if there are any new entries 
                const newEntries = getUniqueEntries(data);

                if (!newEntries || !newEntries.length) { 
                    console.debug("No new entries, returning");
                    return; 
                }
                processNewEntries(newEntries);
            });
        });
    }, 10000);
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg === 'updateSettings') {
        loadSettings();
    }
});

loadSettings();