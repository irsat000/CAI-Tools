
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url) {
        if (details.url.includes("character.ai")) {
            chrome.tabs.sendMessage(details.tabId, {
                name: "Reset_Modal",
                args: {}
            });
        }

        if (details.url.includes("character.ai/chat?char=") || details.url.includes("character.ai/chat2?char=")) {
            //chats and chat?hist= are not included. Former is characters, the latter is a room.
            chrome.tabs.sendMessage(details.tabId, {
                name: "Create_Options_DOM",
                args: {}
            });
        }
    }
});