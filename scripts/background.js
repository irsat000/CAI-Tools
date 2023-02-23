
/*
const interceptHistories = function () {
    console.log("okay I am in");
    xhook.after(function (request, response) {
        console.log("entered!");
        try {
            console.log("entered!");
            const HISTORIES_URL = "https://beta.character.ai/chat/character/histories/";
            if (request.url === HISTORIES_URL && response.status === 200) {
                console.log("truly entered!");
                const jsonData = JSON.parse(response.text).histories;
                console.log(jsonData);
            }
        } catch (error) {
            console.log("Error while intercepting -> " + error);
        }
    });
}*/

chrome.runtime.onMessage.addListener((obj, sender, sendResponse) => {
    const { name, args } = obj;
    switch (name) {
        case "InterceptHistories":
            /*chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: interceptHistories
            });*/
            break;
        default:
            break;
    }
});


chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create({
        id: "cai_downloadhistory",
        title: "Character History",
        contexts: ["all"]
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
                name: "DownloadHistory",
                args: { downloadType: id }
            })
        }
    })
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    chrome.tabs.sendMessage(details.tabId, {
        name: "GiveMeSomething",
        args: { something: details.url }
    })

    
    /*
    if (details.url && details.url.includes("character.ai/chat") && details.url.includes("hist=")) {
        //chrome.contextMenus.remove('cai_downloadconversation', AddButtons);
        if(cai_downloadconversationmenu__exists == false){
            AddButtons();
        }
        function AddButtons() {
            chrome.contextMenus.create({
                id: "cai_downloadconversation",
                title: "Character conversation",
                contexts: ["all"]
            })
            chrome.contextMenus.create({
                parentId: "cai_downloadconversation",
                id: "cai_conversation",
                title: "Download as Pygmalion chat",
                contexts: ["all"]
            })
            chrome.contextMenus.onClicked.addListener(function (info, tab) {
                const id = info.menuItemId;
                if (id === "cai_conversation") {
                    chrome.tabs.sendMessage(details.tabId, {
                        name: "DownloadConversation",
                        args: { downloadType: id }
                    })
                }
            })
            cai_downloadconversationmenu__exists = true;
        }
    }*/
})