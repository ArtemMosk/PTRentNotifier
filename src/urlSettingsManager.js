// urlSettingsManager.js

export default class UrlSettingsManager {
    constructor(logger = console) {
        this.logger = logger;
        // Keys that should always be treated as arrays even if they have a single value
        this.arrayKeys = ['entity_ids'];
    }

    /**
     * Add keys that should always be treated as arrays
     * @param {string[]} keys - Array of keys to be treated as arrays
     */
    addArrayKeys(keys) {
        this.arrayKeys = [...new Set([...this.arrayKeys, ...keys])];
    }

    /**
     * Check if a URL is a configuration URL
     * @param {string} url - URL to check
     * @returns {boolean}
     */
    isConfigUrl(url) {
        return url && url.startsWith("https://ext-config.com/");
    }

    /**
     * Update settings from URL parameters
     * @param {string} url - Configuration URL
     * @param {Object} defaultSettings - Default settings object
     * @returns {Promise} Resolves with updated settings
     */
    async updateSettingsFromUrl(url, defaultSettings) {
        const urlObj = new URL(url);
        const params = urlObj.searchParams;

        // Load existing settings
        const currentSettings = await this.getStorageSync(defaultSettings);
        let updatedSettings = { ...currentSettings };

        // Update settings from all URL query parameters
        for (const key of params.keys()) {
            const values = params.getAll(key);
            this.logger.debug(`Set ${key} to ${values.join(', ')}`);

            // Check if the key should always be an array
            if (this.arrayKeys.includes(key)) {
                updatedSettings[key] = values.map(value => decodeURIComponent(value));
            } else {
                // If multiple values exist for a key, it's treated as an array; otherwise, a single value
                updatedSettings[key] = values.length > 1
                    ? values.map(value => decodeURIComponent(value))
                    : decodeURIComponent(values[0]);
            }
        }

        // Save the updated settings
        await this.setStorageSync(updatedSettings);
        this.logger.info("Updated settings with values loaded from ext-config.com URL");

        return updatedSettings;
    }

    /**
     * Helper method to get chrome storage sync data
     * @param {Object} defaults - Default settings
     * @returns {Promise}
     */
    getStorageSync(defaults) {
        return new Promise((resolve) => {
            chrome.storage.sync.get(defaults, resolve);
        });
    }

    /**
     * Helper method to set chrome storage sync data
     * @param {Object} data - Data to store
     * @returns {Promise}
     */
    setStorageSync(data) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(data, resolve);
        });
    }

    /**
     * Check all tabs for configuration URLs
     */
    async checkConfigTabs() {
        const tabs = await this.queryTabs({});
        for (const tab of tabs) {
            if (this.isConfigUrl(tab.url)) {
                await this.updateSettingsFromUrl(tab.url, {});
            }
        }
    }

    /**
     * Helper method to query tabs
     * @param {Object} queryInfo - Query parameters
     * @returns {Promise}
     */
    queryTabs(queryInfo) {
        return new Promise((resolve) => {
            chrome.tabs.query(queryInfo, resolve);
        });
    }

    /**
     * Initialize tab listeners
     * @param {Object} defaultSettings - Default settings to use
     */
    initializeTabListeners(defaultSettings = {}) {
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && this.isConfigUrl(tab.url)) {
                this.updateSettingsFromUrl(tab.url, defaultSettings);
            }
        });
    }
}