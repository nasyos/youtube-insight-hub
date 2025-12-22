
import { TrackedChannel, GoogleConfig } from "../types";

export class GasGeneratorService {
  static generate(channels: TrackedChannel[], config: GoogleConfig): string {
    const channelList = channels.map(c => `  { name: "${c.name}", handle: "${c.handle}" }`).join(",\n");
    const apiKey = "YOUR_GEMINI_API_KEY_HERE"; // User needs to provide this in GAS

    return `/**
 * YouTube Insight Hub - 24/7 Automation Script
 * このスクリプトを Google Apps Script (https://script.google.com) に貼り付けてください。
 */

const CONFIG = {
  GEMINI_API_KEY: "${apiKey}",
  WEBHOOK_URL: "${config.chatWebhookUrl}",
  CHANNELS: [
${channelList}
  ]
};

function runAutomatedScan() {
  CONFIG.CHANNELS.forEach(channel => {
    try {
      const summary = fetchGeminiSummary(channel);
      if (summary && isNewVideo(summary.url)) {
        const docUrl = createGoogleDoc(summary);
        sendToChat(summary, docUrl);
        markAsProcessed(summary.url);
      }
    } catch (e) {
      console.error("Error processing " + channel.name + ": " + e);
    }
  });
}

function fetchGeminiSummary(channel) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=" + CONFIG.GEMINI_API_KEY;
  const prompt = "YouTubeチャンネル「" + channel.name + "」の最新動画1件を探して要約してください。回答はJSON形式で、title, url, summary, keyPoints(Array)を含めてください。";
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
    tools: [{ googleSearch: {} }]
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });

  const data = JSON.parse(response.getContentText());
  const text = data.candidates[0].content.parts[0].text;
  return JSON.parse(text);
}

function sendToChat(summary, docUrl) {
  if (!CONFIG.WEBHOOK_URL) return;
  const payload = {
    text: "🔔 *[自動巡回]* 新しい動画の要約レポート\\n\\n*タイトル:* " + summary.title + "\\n📄 *Doc:* " + docUrl + "\\n📺 *Video:* " + summary.url
  };
  UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload)
  });
}

function isNewVideo(videoUrl) {
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty(videoUrl)) return false;
  return true;
}

function markAsProcessed(videoUrl) {
  PropertiesService.getScriptProperties().setProperty(videoUrl, "true");
}

function createGoogleDoc(summary) {
  const doc = DocumentApp.create("[Summary] " + summary.title);
  const body = doc.getBody();
  body.appendParagraph(summary.title).setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph("Summary: " + summary.summary);
  summary.keyPoints.forEach(p => body.appendListItem(p));
  doc.saveAndClose();
  return doc.getUrl();
}
`;
  }
}
