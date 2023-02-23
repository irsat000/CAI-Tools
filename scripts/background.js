
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
        id: "pygmalion_dumper",
        title: "Pygmalion dumper",
        contexts: ["all"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "pygmalion_example_chat",
        title: "Download as Pygmalion example chat",
        contexts: ["all"]
    })
    chrome.contextMenus.onClicked.addListener(function (info, tab) {
        const id = info.menuItemId;
        if (id === "cai_offline_read" || id === "pygmalion_dumper" || id === "pygmalion_example_chat") {
            chrome.tabs.sendMessage(tab.id, {
                name: "DownloadCAIHistory",
                args: { downloadType: id }
            })
        }
    })
});