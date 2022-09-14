class AbstractLogger {
    constructor(className) {
        this.className = className;
    }
}
class RegularConsole extends AbstractLogger {
    log(...msg) {
        console.log(...msg);
    }
    debug(...data) {
        console.debug(...data);
    }
    warn(...data) {
        console.warn(...data);
    }
    info(...data) {
        console.info(...data);
    }
    error(...data) {
        console.error(...data);
    }
}
class RemoteConsole extends AbstractLogger {
    log(...msg) {
        console.log(...msg);
    }
    debug(...data) {
        console.debug(...data);
    }
    warn(...data) {
        console.warn(...data);
    }    
    info(...data) {
        console.info(...data);
    }
    error(...data) {
        console.error(...data);
    }   
}

class LogWrapper {
    static logTypes = {
        REGULAR_CONSOLE: 0,
        REMOTE_CONSOLE: 1
    }
    getLogger(className, logType = LogWrapper.logTypes.REGULAR_CONSOLE) {
        const l = LogWrapper.logTypes;
        if (logType === l.REMOTE_CONSOLE) {
            this.logger = new RemoteConsole();
        } else {
            this.logger = new RegularConsole(className);
        }
        return this.logger;
    }
}

export {LogWrapper as default}