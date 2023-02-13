
class Sender {
    constructor() {
    }

    sendMessageTelegram(token, chat_id, message) {
        if (!token || !chat_id) {
            console.info("Telegram token or chat ID not specified, skipping sending to Telegram. ");
            return;
        }
        var url = 'https://api.telegram.org/bot' + token + '/sendMessage'
        //?chat_id=' + chat_id + '&text=' + message + '&parse_mode=html';
        console.debug("Sending message " + url);
        
        fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: '{"chat_id": "-1001891653474", "text": "' + message + '", "parse_mode" : "html", "disable_notification": false}',
        }).catch(error => {
            console.warn("Can't send message to Telegram. Please check settings");
            console.debug(error);
        });
    }

    sendMessageNotification(message) {
        chrome.notifications.create('', {
            title: "Оновлення фонової сторінки",
            message: message,
            iconUrl: '/src/vendor/img/keyhole_32.png',
            type: 'basic'
        });
    }
    
    sendMessageIfttt(iftttEventName, key, messageJson) {
        let url = "https://maker.ifttt.com/trigger/" + iftttEventName +"/json/with/key/" + key;
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
            console.warn("CORS raising error but IFTTT should still receive message. If it does not check key and event name.");
        });
    }

    sendMessageCustomHook(webhookUrl, message) {
        console.debug("Sending message " + webhookUrl);
        console.debug("Sending message to custom hook:");
        console.debug(message);
        fetch(webhookUrl, {
            method: 'POST',
            body: JSON.stringify(message)
        }).catch(error => {
            console.warn("Can't send message to custom hook. Please check webhook URL");
            //console.debug(error);
        });
    }

    sendMessageSlack(webhookUrl, slackMentionUsername, slackChannelName, message) {
        const smu = slackMentionUsername ?  "<@" + slackMentionUsername.replace(/@/g, "") + ">" : ""
        const channelName = "#" + slackChannelName.replace(/[#@]/g, "");

        console.debug("Sending message " + webhookUrl);
        console.debug("Sending message to slack:");
        console.debug(message);
        fetch(webhookUrl, {
            method: 'POST',
            body: "{\"channel\": \"" + channelName + "\", \"username\": \"upParser\", \"text\": \"" + smu + " " + message +"\", \"icon_emoji\": \":ghost:\"}"
        }).catch(error => {
            console.warn("Can't send message to slack. Please check webhook URL");
            //console.debug(error);
        });
    }
}

class SenderFactory {
    constructor() {
    }

    getSender() {
        return new Sender();
    }
}

export {SenderFactory as default}