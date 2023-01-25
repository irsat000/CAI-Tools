let cai_downloadhistorymenu__exists = false;
chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url && details.url.includes("character.ai/histories")) {
        chrome.tabs.sendMessage(details.tabId, {
            type: "WatchHistoryRequest",
            utility: {}
        })

        //Download history menu items
        chrome.contextMenus.remove('cai_downloadhistory', AddButtons);
        function AddButtons() {
            chrome.contextMenus.create({
                id: "cai_downloadhistory",
                title: "Character History",
                contexts: ["all"]
            })
            chrome.contextMenus.create({
                parentId: "cai_downloadhistory",
                id: "caih_asHTML",
                title: "Download as Page",
                contexts: ["all"]
            })
            chrome.contextMenus.create({
                parentId: "cai_downloadhistory",
                id: "caih_asJSON",
                title: "Download as JSON",
                contexts: ["all"]
            })
            chrome.contextMenus.create({
                parentId: "cai_downloadhistory",
                id: "caih_asTXT",
                title: "Download as Text",
                contexts: ["all"]
            })
            chrome.contextMenus.onClicked.addListener(function (info, tab) {
                const id = info.menuItemId;
                if (id === "caih_asHTML" || id === "caih_asJSON" || id === "caih_asTXT") {
                    chrome.tabs.sendMessage(details.tabId, {
                        type: "DownloadHistory",
                        utility: { downloadType: id }
                    })
                }
            })
            cai_downloadhistorymenu__exists = true;
        }
        /*chrome.tabs.sendMessage(details.tabId, {
            type: "CreateBtns",
            utility: { ran: times.toString() }
        });*/
    }
    else {
        if(cai_downloadhistorymenu__exists){
            chrome.contextMenus.remove('cai_downloadhistory');
        }
        /*chrome.tabs.sendMessage(details.tabId, {
            type: "CheckModal",
            utility: { ran: times.toString() }
        });*/
    }
})