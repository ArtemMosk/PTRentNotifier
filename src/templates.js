let templates = {
  slackTemplate: "\n<{{&url}}|{{title}}>\n:clock1: {{&duration}}{{^duration}}N/A{{/duration}}\n:money_with_wings: {{budget}}{{^budget}}N/A{{/budget}}  |  :briefcase: {{jobType}}  |  :level_slider: {{contractorTier}}\n_Tags:_ {{tags}}\n_Posted On:_ {{postedOn}}\n_Query_: {{&pageTitle}}"
}
export default templates;
