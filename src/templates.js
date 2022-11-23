let templates = {
  slackTemplate: "\n<{{&url}}|{{title}}>\n:clock1: {{&duration}}{{^duration}}N/A{{/duration}}\n:money_with_wings: {{budget}}{{^budget}}N/A{{/budget}}  |  :briefcase: {{jobType}}  |  :level_slider: {{contractorTier}}\n_Tags:_ {{tags}}\n_Posted On:_ {{postedOn}}\n_Query_: {{&pageTitle}}",
  fileTemplates: {},

  templatesDir: "src/templates/",
  loadTemplatesFromList: function(templateFileNames) {
    templateFileNames.forEach(fileName => {
      this.loadTemplateFromFile(fileName);
   });
  },
//TODO need delivery channel separation and general template implementation!
  loadTemplateFromFile:function(fileName) {
    let fullFileName = this.templatesDir + fileName;
    const ext = fullFileName.split('.').pop();
    if ("html" !== ext && "mustache" !== ext) { fullFileName = fullFileName + '.mustache'; }

    fetch(chrome.runtime.getURL(fullFileName)).then(response => response.text()).then(text => {
      this.fileTemplates[fileName] = text;
    }).catch(error => {
      console.warn("Can't load mustache template " + fullFileName);
      console.warn("Error " + error);
    });
  }
}

export default templates;