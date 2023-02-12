let templates = {
  fileTemplates: {},

  templatesDir: "src/templates/",
  loadTemplatesFromList: function(templateFileNames) {
    let result = []
    templateFileNames.forEach(fileName => {
      result.push(this.loadTemplateFromFile(fileName));
    });
    return result;
  },

  loadSenderTemplates: function(parsersSettings, deliveryMethodNames) {
    parsersSettings.forEach(cs => {
     deliveryMethodNames.forEach(deliveryMethod => {
          if (this.fileTemplates[cs.name] && this.fileTemplates[cs.name][deliveryMethod]) {
            return;
          }
          const loadedPromise = templates.loadTemplateFromFile(cs.name + "__" + deliveryMethod + "__");
          loadedPromise.then(text => {
            if (!this.fileTemplates[cs.name]) this.fileTemplates[cs.name] = {};
            this.fileTemplates[cs.name][deliveryMethod] = text;
          });
      });
    });
  },

//TODO need delivery channel separation and general template implementation!
  loadTemplateFromFile: async function(fileName) {
    let fullFileName = this.templatesDir + fileName;
    const ext = fullFileName.split('.').pop();
    if ("html" !== ext && "mustache" !== ext) { fullFileName = fullFileName + '.mustache'; }

    try {
      const response = await fetch(chrome.runtime.getURL(fullFileName));
      const text = await response.text();
      return text;
    } catch (error) {
      console.warn("Can't load mustache template " + fullFileName);
      console.warn("Error " + error);
    }
  }
}

export default templates;