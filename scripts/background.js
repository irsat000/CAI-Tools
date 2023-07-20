
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url) {
        chrome.tabs.sendMessage(details.tabId, {
            name: "Reset_Modal",
            args: {}
        });

        if (details.url.includes("character.ai/histories") ||
            details.url.includes("character.ai/chat") ||
            details.url.includes("character.ai/chat2")) {
            chrome.tabs.sendMessage(details.tabId, {
                name: "Create_Options_DOM",
                args: {}
            });
        }
    }
});