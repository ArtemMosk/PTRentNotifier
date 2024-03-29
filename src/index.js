import settings from '/src/settings.js';
import settingsHelper from '/src/settingsHelper.js';

const manifest = chrome.runtime.getManifest();
const contentScripts = manifest['content_scripts'];
const globalParams = settings.globalParams;

// Saves options to chrome.storage
function saveOptions() {
  
  const telegramId = document.getElementById('telegramId').value;
  const telegramGroupId = document.getElementById('telegramGroupId').value;

  const iftttKey = document.getElementById('iftttKey').value;
  const iftttEventName = document.getElementById('iftttEventName').value;

  const customHookUrl = document.getElementById('customHookUrl').value;

  const slackWebhookUrl = document.getElementById('slackWebhookUrl').value;
  const slackMentionUsername = document.getElementById('slackMentionUsername').value;
  const slackChannelName = document.getElementById('slackChannelName').value;

  const checkPeriod = document.getElementById('checkPeriod').value;
  const numberOfTabsToCheck = document.getElementById('numberOfTabsToCheck').value;

  const isShowNotifications = document.getElementById('isShowNotifications').checked;
  const isSendIfttt = document.getElementById('isSendIfttt').checked;
  const isSendCustomHook = document.getElementById('isSendCustomHook').checked;
  const isSendMessageTelegram = document.getElementById('isSendMessageTelegram').checked;
  const isSendMessageSlack = document.getElementById('isSendMessageSlack').checked;
  const settingsJson = {
    telegramId: telegramId,
    telegramGroupId: telegramGroupId,
    checkPeriod: checkPeriod,
    numberOfTabsToCheck: numberOfTabsToCheck,
    slackWebhookUrl: slackWebhookUrl,
    slackMentionUsername: slackMentionUsername,
    slackChannelName: slackChannelName,
    isShowNotifications: isShowNotifications,
    isSendMessageTelegram: isSendMessageTelegram,
    isSendMessageSlack: isSendMessageSlack,
    isSendIfttt: isSendIfttt,
    iftttEventName: iftttEventName,
    iftttKey: iftttKey,
    isSendCustomHook: isSendCustomHook,
    customHookUrl: customHookUrl,
  }

  settingsJson.parsersSettings = []
  let ps = settingsJson.parsersSettings;

  contentScripts.forEach(contentScript => {
    let match = contentScript.matches[0];
    const elemId = settingsHelper.purifyMatchToName(match);

    ps.push(
      {
          'name': settingsHelper.purifyMatchToName(match),
          'match': match, 
          "parse": document.getElementById(elemId).checked
      }
    )
  });

  chrome.storage.sync.set(settingsJson, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Збережено';
    setTimeout(function() {
       status.textContent = '';
    }, 1000);
  });

  sendMessageToBackgroundScript("updateSettings");
}

function switchVisibility(e, shouldShow) {
  if (shouldShow) {
    e.style.visibility = 'visible';
    e.style.display = "block";
  } else {
    e.style.visibility = 'hidden';
    e.style.display = 'none';
  }
}

function sendMessageToBackgroundScript(msg) {
  chrome.runtime.sendMessage(msg, response => {
    console.debug("Sent request to background script: " + msg);
  });
}
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  globalParams.parsersSettings = []
  let ps = globalParams.parsersSettings;

  switchVisibility(document.getElementById("forceRun"), globalParams.isDebug);
  contentScripts.forEach(contentScript => {
      let match = contentScript.matches[0];
      const name = settingsHelper.purifyMatchToName(match);
      ps.push(
          {
              'name': name,
              'match': match, 
              "parse": contentScript.parse_by_default
          }
      );
      let e = document.getElementById("label" + name);
      switchVisibility(e, (contentScript.visible === 'true' || contentScript.visible === true));
  });

  chrome.storage.sync.get(globalParams, function(items) {
    document.getElementById('telegramId').value = items.telegramId;
    document.getElementById('telegramGroupId').value = items.telegramGroupId;
    document.getElementById('checkPeriod').value = items.checkPeriod;
    document.getElementById('numberOfTabsToCheck').value = items.numberOfTabsToCheck;
    document.getElementById('slackWebhookUrl').value = items.slackWebhookUrl;
    document.getElementById('slackMentionUsername').value = items.slackMentionUsername;
    document.getElementById('slackChannelName').value = items.slackChannelName;
    document.getElementById('isShowNotifications').checked = items.isShowNotifications;
    document.getElementById('isSendMessageSlack').checked = items.isSendMessageSlack;
    document.getElementById('isSendMessageTelegram').checked = items.isSendMessageTelegram;
    document.getElementById('isSendIfttt').checked = items.isSendIfttt;

    document.getElementById('iftttEventName').value = items.iftttEventName;
    document.getElementById('iftttKey').value = items.iftttKey;

    document.getElementById('isSendCustomHook').checked = items.isSendCustomHook;
    document.getElementById('customHookUrl').value = items.customHookUrl;
    

    items.parsersSettings.forEach(element => {
        document.getElementById(element.name).checked = element.parse
    });
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);

const anyInput = Array.from(document.getElementsByTagName('input'));
anyInput.forEach(input => {
  input.addEventListener('change', (event) => {
    saveOptions();
  });
});

function testTelegramCaller() {
  sendMessageToBackgroundScript("testTelegram");
  return false;
}

document.getElementById('testTelegram').addEventListener('click', testTelegramCaller);


function forceRun() {
  sendMessageToBackgroundScript("forceRun");
  return false;
}

document.getElementById('forceRun').addEventListener('click', forceRun);