import SenderFactory from '/src/sender.js';
import mustache from '/src/vendor/lib/mustache.js'
import settings from '/src/settings.js';
import templates from '/src/templates.js';
const constants = settings.const;

class JobMessageSender {
    constructor(applicationSettings) {
        this.applicationSettings = applicationSettings;
        this.sender = (new SenderFactory()).getSender()
    }

    sendTemplated(job) {
        let result = false;
        let resourceTemplateCollection = templates.fileTemplates[job.messageTemplate];
        const sm = render("slack");
        if (sm) {
            this.sendMessageSlack(sm);
        } else {
            this.sendMessageSlack(this.buildStrFromJson(job, "\n", " "));
        }
        const tgm = render("telegram");
        if (tgm) {
            this.sendMessageTelegram(tgm, false);
        } else {
            this.sendMessageTelegram(this.buildStrFromJson(job, " \n ", " "), false);
        }
        const nm = render("notification");
        if (nm) {
            this.sendMessageNotification(nm);
        } else {
            this.sendMessageNotification(this.buildStrFromJson(job, "\n", " "));
        }
        result = sm || tgm || nm;
        return result;

        function render(deliveryChannel) {
            if (!resourceTemplateCollection) {
                console.debug("No templates for template " + job.messageTemplate);
                return "";
            }
            let templateKey = resourceTemplateCollection[deliveryChannel] || resourceTemplateCollection["general"];
            if (!templateKey) {
                console.debug("No template found for " + job.messageTemplate + " delivery channel " + deliveryChannel)
                return "";
            }
            return mustache.render(templateKey, job);
        }
    }

    buildStrFromJson(entry, separator, spaceSymbol) {
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
            result += jsonLine + ":" + spaceSymbol + toAdd + separator;
        }
        return result
    }
    

    notifyOnJob(job) {
        //TODO redo to normal collection of senders, this is mess any templated message availability prevents further senders from being executed
        let undefinedTemplate = !job.messageTemplate || job.messageTemplate === constants.noTemplate 
        if (undefinedTemplate) {
            console.debug("No template. Sending default message");
        }
        this.sendTemplated(job);
        this.sendMessageIfttt(job);
        this.sendMessageCustomHook(job);
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
        this.sender.sendMessageTelegram(token, chat_id, message);
    }

    sendMessageNotification(message) {
        let as = this.applicationSettings;
        if (!as.isShowNotifications) {
            console.debug("Notifications are turned off, skipping popup");
            return;
        }
        this.sender.sendMessageNotification(message);
    }

    sendMessageCustomHook(messageJson) {
        let as = this.applicationSettings;
        if (!as.isSendCustomHook) {
            console.debug("Custom hook is turned off, skipping send");
            return;
        }
        const url = as.customHookUrl;
        if (!url) {
            console.info("URL for custom hook is not specified, skipping send.");
            return;
        }
        this.sender.sendMessageCustomHook(url, messageJson);
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
        this.sender.sendMessageIfttt(as.iftttEventName, key, messageJson);
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
        this.sender.sendMessageSlack(url, as.slackMentionUsername, as.slackChannelName, message)
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

class JobMessageSenderFactory {
    constructor() {
    }

    getJobMessageSender(applicationSettings) {
        if (!applicationSettings) {
            throw ("Trying to initialize message job message sender without providing application settings!"); 
        }
        return new JobMessageSender(applicationSettings);
    }
}

export {JobMessageSenderFactory as default}