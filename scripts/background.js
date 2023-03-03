
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
        title: "History Dump (json)",
        contexts: ["all"]
    })
    chrome.contextMenus.create({
        parentId: "cai_downloadhistory",
        id: "cai_dump_anon",
        title: "History Dump (anonymous)",
        contexts: ["all"]
    })
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
    const id = info.menuItemId;
    if (id === "cai_offline_read" || id === "example_chat" || id === "cai_dump" || id === "cai_dump_anon") {
        chrome.tabs.sendMessage(tab.id, {
            name: "DownloadCAIHistory",
            args: { downloadType: id }
        })
    }
})