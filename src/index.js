// Saves options to chrome.storage
function saveOptions() {
  const telegramId = document.getElementById('telegramId').value;
  const telegramGroupId = document.getElementById('telegramGroupId').value;

  const iftttKey = document.getElementById('iftttKey').value;
  const iftttEventName = document.getElementById('iftttEventName').value;

  const slackWebhookUrl = document.getElementById('slackWebhookUrl').value;
  const slackMentionUsername = document.getElementById('slackMentionUsername').value;
  const slackChannelName = document.getElementById('slackChannelName').value;

  const checkPeriod = document.getElementById('checkPeriod').value;

  const isShowNotifications = document.getElementById('isShowNotifications').checked;
  const isSendIfttt = document.getElementById('isSendIfttt').checked;
  const isSendMessageTelegram = document.getElementById('isSendMessageTelegram').checked;
  const isSendMessageSlack = document.getElementById('isSendMessageSlack').checked;

  const isProcessIdealista = document.getElementById('isProcessIdealista').checked;
  const isProcessOlx = document.getElementById('isProcessOlx').checked;
  const isProcessFb = document.getElementById('isProcessFb').checked;

  chrome.storage.sync.set({
    telegramId: telegramId,
    telegramGroupId: telegramGroupId,
    checkPeriod: checkPeriod,
    slackWebhookUrl: slackWebhookUrl,
    slackMentionUsername: slackMentionUsername,
    slackChannelName: slackChannelName,
    isShowNotifications: isShowNotifications,
    isSendMessageTelegram: isSendMessageTelegram,
    isSendMessageSlack: isSendMessageSlack,
    isSendIfttt: isSendIfttt,
    iftttEventName: iftttEventName,
    iftttKey: iftttKey,
    isProcessIdealista: isProcessIdealista,
    isProcessFb: isProcessFb,
    isProcessOlx: isProcessOlx
  }, function() {
    // Update status to let user know options were saved.
    var status = document.getElementById('status');
    status.textContent = 'Збережено';
    setTimeout(function() {
       status.textContent = '';
    }, 1000);
  });

  sendMessageToBackgroundScript("updateSettings");
}

function sendMessageToBackgroundScript(msg) {
  chrome.runtime.sendMessage(msg, response => {
    console.debug("Sent request to background script: " + msg);
  });
}
// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    telegramId: "",
    telegramGroupId: "",
    checkPeriod: "10",
    slackWebhookUrl: "",
    slackMentionUsername: "",
    slackChannelName: "",
    isShowNotifications: true,
    isSendMessageSlack: false,
    isSendMessageTelegram: false,
    isSendIfttt: false,
    iftttEventName: "",
    iftttKey: "",
    isProcessIdealista: true,
    isProcessOlx: true,
    isProcessFb: true
  }, function(items) {
    document.getElementById('telegramId').value = items.telegramId;
    document.getElementById('telegramGroupId').value = items.telegramGroupId;
    document.getElementById('checkPeriod').value = items.checkPeriod;
    document.getElementById('slackWebhookUrl').value = items.slackWebhookUrl;
    document.getElementById('slackMentionUsername').value = items.slackMentionUsername;
    document.getElementById('slackChannelName').value = items.slackChannelName;
    document.getElementById('isShowNotifications').checked = items.isShowNotifications;
    document.getElementById('isSendMessageSlack').checked = items.isSendMessageSlack;
    document.getElementById('isSendMessageTelegram').checked = items.isSendMessageTelegram;
    document.getElementById('isSendIfttt').checked = items.isSendIfttt;
    document.getElementById('isProcessIdealista').checked = items.isProcessIdealista;
    document.getElementById('isProcessOlx').checked = items.isProcessOlx;
    document.getElementById('isProcessFb').checked = items.isProcessFb;

    document.getElementById('iftttEventName').value = items.iftttEventName;
    document.getElementById('iftttKey').value = items.iftttKey;
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click',
    saveOptions);

function testTelegramCaller() {
  sendMessageToBackgroundScript("testTelegram");
  return false;
}

document.getElementById('testTelegram').addEventListener('click', testTelegramCaller);