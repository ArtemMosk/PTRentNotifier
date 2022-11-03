
class Sender {
    constructor(applicationSettings) {
        this.applicationSettings = applicationSettings;
    }

    sendMessageTelegram(message, forceSend) {
        let as = this.applicationSettings;
        if (!as.isSendMessageTelegram && !forceSend) {
            console.debug("Telegram is turned off, skipping send");
            return;
        }
        var token = as.telegramId;
        var chat_id = as.telegramGroupId;
        if (!token || !chat_id) {
            console.info("Telegram token or chat ID not specified, skipping sending to Telegram. ");
            return;
        }
        var url = 'https://api.telegram.org/bot' + token + '/sendMessage?chat_id=' + chat_id + '&text=' + message + '&parse_mode=html';
        console.debug("Sending message " + url);
        
        fetch(url);
    }

    sendMessageNotification(message) {
        let as = this.applicationSettings;
        if (!as.isShowNotifications) {
            console.debug("Notifications are turned off, skipping popup");
            return;
        }
        chrome.notifications.create('', {
            title: "Оновлення фонової сторінки",
            message: message,
            iconUrl: '/src/vendor/img/keyhole_32.png',
            type: 'basic'
        });
    }

    sendMessageIfttt(messageJson) {
        let as = this.applicationSettings;
        if (!as.isSendIfttt) {
            console.debug("IFTTT is turned off, skipping send");
            return;
        }

        const key = as.iftttKey;
        if (!key) {
            console.info("IFTTT key is not specified, skipping send to IFTTT.");
            return;
        }

        let url = "https://maker.ifttt.com/trigger/" + as.iftttEventName +"/json/with/key/" + key;
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

    sendMessageSlack(message) {
        let as = this.applicationSettings;
        if (!as.isSendMessageSlack) {
            console.debug("Slack is turned off, skipping send");
            return;
        }

        const url = as.slackWebhookUrl;
        if (!url) {
            console.info("Slack webhook url is not specified, skipping send to slack.");
            return;
        }
        
        const smu = as.slackMentionUsername ?  "<@" + as.slackMentionUsername.replace(/@/g, "") + ">" : ""
        const channelName = "#" + as.slackChannelName.replace(/[#@]/g, "");
        const slackMentionUsername = smu;

        console.debug("Sending message " + url);
        let escMessage = this.escapeSpecialChars(message);

        fetch(url, {
            method: 'POST',
            body: "{\"channel\": \"" + channelName + "\", \"username\": \"upParser\", \"text\": \"" + slackMentionUsername + escMessage +"\", \"icon_emoji\": \":ghost:\"}"
        }).catch(error => {
            console.warn("Can't send message to slack. Please check webhook URL");
            //console.debug(error);
        });
    }

    escapeSpecialChars(str) {
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
}

class SenderFactory {
    constructor() {
    }

    getSender(applicationSettings) {
        if (!applicationSettings) {
            throw ("Trying to initialize message sender without providing application settings!"); 
        }
        return new Sender(applicationSettings);
    }
}

export {SenderFactory as default}