
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url) {
        chrome.tabs.sendMessage(details.tabId, {
            name: "Reset_Modal",
            args: {}
        });

        if (details.url.includes("character.ai/histories") || details.url.includes("character.ai/comms")) {
            chrome.tabs.sendMessage(details.tabId, {
                name: "Create_Options_DOM",
                args: {}
            });
        }
    }
});

/*
DEPRECATED

chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "cai_downloadhistory",
        title: "Character History",
        contexts: ["all"],
        documentUrlPatterns: ["https://beta.character.ai/*"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "cai_offline_read",
        title: "Download to read offline",
        contexts: ["all"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "example_chat",
        title: "Download as example chat (txt)",
        contexts: ["all"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "cai_dump",
        title: "Character Dump (json)",
        contexts: ["all"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "cai_dump_anon",
        title: "Character Dump (anonymous)",
        contexts: ["all"]
    })

    chrome.contextMenus.create({
        id: "cai_settings_view",
        title: "Download Settings (viewer)",
        contexts: ["all"],
        documentUrlPatterns: ["https://beta.character.ai/*"]
    })
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    const id = info.menuItemId;
    switch (id) {
        case "cai_offline_read":
        case "example_chat":
        case "cai_dump":
        case "cai_dump_anon":
            chrome.tabs.sendMessage(tab.id, {
                name: "DownloadCAIHistory",
                args: { downloadType: id }
            })
            break;
        case "cai_settings_view":
        case "cai_settings_json":
            chrome.tabs.sendMessage(tab.id, {
                name: "DownloadCharSettings",
                args: { downloadType: id }
            })
            break;
        default:
            break;
    }
})

*/