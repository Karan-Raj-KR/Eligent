chrome.runtime.onInstalled.addListener(() => {
  console.log("Opportunity extension installed");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PROFILE") {
    chrome.storage.sync.get(["profile"], (result) => {
      sendResponse({ profile: result.profile || null });
    });
    return true;
  }
  
  if (message.type === "SAVE_PROFILE") {
    chrome.storage.sync.set({ profile: message.profile }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});