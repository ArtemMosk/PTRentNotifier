let settings = {
    "globalParams": {
        "telegramId": "",
        "telegramGroupId": "",
        "isSendMessageTelegram": false,
        "slackWebhookUrl": "",
        "slackMentionUsername": "",
        "slackChannelName": "",
        "isSendMessageSlack": false,
        "checkPeriod": "10",
        "numberOfTabsToCheck": "1",
        "isShowNotifications": true,
        "iftttEventName": "",
        "iftttKey": "",
        "isSendIfttt": false,
        "isDebug": false,
      },
    const: {
      "deliveryMethodNames": ["slack", "telegram", "ifttt", "notification", "general"],
      "noTemplate": "noTemplate",
    }
}

export default settings;
