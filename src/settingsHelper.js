let settingsHelper = {
    purifyMatchToName: function(matchStr) {
        return matchStr.replaceAll("*", '').replaceAll(':', '').replaceAll('/', '');
    }
}

export default settingsHelper;