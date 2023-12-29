let settings = {
    "globalParams": {
        "telegramId": "",
        "telegramGroupId": "",
        "isSendMessageTelegram": false,
        "slackWebhookUrl": "",
        "customHookUrl": "",
        "slackMentionUsername": "",
        "slackChannelName": "",
        "isSendMessageSlack": false,
        "checkPeriod": "10",
        "numberOfTabsToCheck": "1",
        "isShowNotifications": true,
        "iftttEventName": "",
        "iftttKey": "",
        "isSendIfttt": false,
        "isSendCustomHook": false,
        "isDebug": false,
        "HeartbeatApiUrl": "",
        "ResultsApiUrl": "",
        "isSendHeartBeat": false,
        "entity_ids": []
      },
    const: {
      "deliveryMethodNames": ["slack", "telegram", "ifttt", "notification", "general"],
      "noTemplate": "noTemplate",
    }
}

export default settings;

