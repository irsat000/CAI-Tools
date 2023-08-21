
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url) {
        if (details.url.includes("character.ai")) {
            chrome.tabs.sendMessage(details.tabId, {
                name: "Reset_Modal",
                args: {}
            });
        }

        if (details.url.includes("character.ai/histories") ||
            details.url.includes("character.ai/chat")) {
            //chat2 included
            chrome.tabs.sendMessage(details.tabId, {
                name: "Create_Options_DOM",
                args: {}
            });
        }
    }
});