export default class Logger {
    constructor(prefix = '') {
        this.prefix = prefix;
        this.defaultGraylogEndpoint = 'https://gelf.pt.artemm.info/gelf';
        this.instanceId = null;
        this.containerName = null;
        
        // Initialize instance ID and container name
        this._initializeInstanceId();
        this._parseContainerFromUrl();
    }
    
    async _initializeInstanceId() {
        try {
            const stored = await chrome.storage.local.get('instanceId');
            if (!stored.instanceId) {
                this.instanceId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
                await chrome.storage.local.set({ instanceId: this.instanceId });
            } else {
                this.instanceId = stored.instanceId;
            }
        } catch (error) {
            // Fallback instance ID if storage fails
            this.instanceId = 'fallback-' + Date.now();
            console.warn('Failed to initialize instance ID:', error);
        }
    }
    
    async _parseContainerFromUrl() {
        try {
            // First check if container was stored from config URL
            const stored = await chrome.storage.local.get('containerName');
            if (stored.containerName) {
                this.containerName = stored.containerName;
                return;
            }
            
            // Try to get from current tab URL if it's a config URL
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs && tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                if (url.hostname === 'ext-config.com') {
                    const container = url.searchParams.get('container');
                    if (container) {
                        this.containerName = container;
                        // Store it for future use
                        await chrome.storage.local.set({ containerName: container });
                    }
                }
            }
        } catch (error) {
            // Container name is optional, so we can fail silently
            this.containerName = null;
        }
    }

    _log(level, message, data = null) {
        let timestamp;
        let prefix;
        let location;
        let fullMessage;
        
        try {
            timestamp = new Date().toISOString();
            prefix = this.prefix ? ` [${this.prefix}]` : '';
            
            // Get the caller's stack trace
            const stack = new Error().stack.split('\n')[3];
            const fileInfo = stack.match(/at .+ \((.+)\)/) || stack.match(/at (.+)/);
            location = fileInfo ? fileInfo[1] : 'unknown';
            
            // Build the full message string safely
            fullMessage = timestamp + prefix + ' ' + message;
            if (location && location !== 'unknown') {
                fullMessage = fullMessage + ' (' + location + ')';
            }
            
            // For warn/error levels, ensure message is in data for Graylog visibility
            if ((level === 'warn' || level === 'error') && data && typeof data === 'object') {
                // Add message to data object if not already present
                if (!data.message) {
                    data = { message, ...data };
                }
            } else if ((level === 'warn' || level === 'error') && !data) {
                // Create data object with message for warn/error
                data = { message };
            }
            
            // Log to console safely
            this._logToConsole(level, fullMessage, data);
            
        } catch (e) {
            console.error('Logger error in _log:', e);
            // Fallback logging
            console.log(String(message), data || '');
        }
        
        // Save and send logs (with error handling)
        this._saveLog(level, message, data, location).catch(err => {
            console.warn('Failed to save log:', err.message);
        });
        
        this._sendToGraylog(level, message, data, location).catch(err => {
            // Silently fail Graylog sends
        });
    }
    
    _logToConsole(level, fullMessage, data) {
        try {
            // Append data as JSON string if present
            let consoleMessage = fullMessage;
            if (data) {
                consoleMessage = consoleMessage + ' Data: ' + JSON.stringify(data);
            }
            
            // Use appropriate console method
            switch(level) {
                case 'error':
                    console.error(consoleMessage);
                    break;
                case 'warn':
                    console.warn(consoleMessage);
                    break;
                case 'debug':
                    console.debug(consoleMessage);
                    break;
                case 'info':
                default:
                    console.log(consoleMessage);
                    break;
            }
        } catch (e) {
            console.error('Failed to log to console:', e);
            // Last resort fallback
            console.log(String(fullMessage));
        }
    }

    debug(message, data = null) {
        this._log('debug', message, data);
    }

    info(message, data = null) {
        this._log('info', message, data);
    }

    warn(message, data = null) {
        this._log('warn', message, data);
    }

    error(message, data = null) {
        this._log('error', message, data);
    }

    async _saveLog(level, message, data, location) {
        try {
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                prefix: this.prefix,
                message,
                data,
                location
            };

            const { debugLogs = [] } = await chrome.storage.local.get('debugLogs');
            debugLogs.push(logEntry);
            if (debugLogs.length > 1000) debugLogs.shift();
            await chrome.storage.local.set({ debugLogs });
        } catch (error) {
            console.warn('Failed to save log to storage:', error.message);
        }
    }

    static async getLogs() {
        try {
            const { debugLogs = [] } = await chrome.storage.local.get('debugLogs');
            return debugLogs;
        } catch (error) {
            console.error('Failed to get logs:', error);
            return [];
        }
    }

    static async clearLogs() {
        try {
            await chrome.storage.local.remove('debugLogs');
        } catch (error) {
            console.error('Failed to clear logs:', error);
        }
    }

    async _sendToGraylog(level, message, data, location) {
        try {
            // Get manifest for extension info
            const manifest = chrome.runtime.getManifest();
            
            // Auto-detect facility from manifest name
            let facility;
            if (this.prefix && this.prefix.startsWith('TEST-')) {
                facility = 'test-race-chrome';
            } else {
                // Convert extension name to facility format
                facility = manifest.name.toLowerCase().replace(/\s+/g, '_');
            }
            
            // Get endpoint
            let graylogEndpoint;
            if (this.prefix && this.prefix.startsWith('TEST-')) {
                graylogEndpoint = this.defaultGraylogEndpoint;
            } else {
                const settings = await chrome.storage.sync.get('graylogEndpoint');
                graylogEndpoint = settings.graylogEndpoint || this.defaultGraylogEndpoint;
            }
            
            if (!graylogEndpoint) {
                return; // No endpoint configured, skip logging
            }
            
            // Ensure instance ID is initialized
            if (!this.instanceId) {
                await this._initializeInstanceId();
            }

            const gelfMessage = {
                version: '1.1',
                host: manifest.name || 'unknown_extension',
                short_message: message,
                full_message: data ? JSON.stringify(data) : message,
                timestamp: Date.now() / 1000,
                level: this._getGelfLevel(level),
                facility: facility,
                _prefix: this.prefix,
                _location: location,
                _data: data ? JSON.stringify(data) : null,
                _instance_id: this.instanceId,
                _container: this.containerName || 'unknown',
                _extension_version: manifest.version,
                _extension_name: manifest.name
            };

            await fetch(graylogEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gelfMessage)
            });
        } catch (error) {
            // Silently fail to avoid logging loops
            // Only log to console in development
            if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
                console.warn('Failed to send log to Graylog:', error.message);
            }
        }
    }

    _getGelfLevel(level) {
        switch (level) {
            case 'debug': return 7;
            case 'info': return 6;
            case 'warn': return 4;
            case 'error': return 3;
            default: return 6;
        }
    }
}