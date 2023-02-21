let cai_downloadhistorymenu__exists = false;
let cai_downloadconversationmenu__exists = false;
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


chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    chrome.tabs.sendMessage(details.tabId, {
        name: "GiveMeSomething",
        args: { something: details.url }
    })
    closeAllMenus();
    if (details.url && details.url.includes("character.ai/histories")) {

        /*chrome.tabs.sendMessage(details.tabId, {
            name: "GiveMeSomething",
            args: { }
        })*/

        //Download history menu items
        chrome.contextMenus.remove('cai_downloadhistory', AddButtons);
        function AddButtons() {
            chrome.contextMenus.create({
                id: "cai_downloadhistory",
                title: "Character History",
                contexts: ["all"]
            })
            /*chrome.contextMenus.create({
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
            })*/
            chrome.contextMenus.create({
                parentId: "cai_downloadhistory",
                id: "pygmalion_example_chat",
                title: "Pygmalion example chat",
                contexts: ["all"]
            })
            chrome.contextMenus.onClicked.addListener(function (info, tab) {
                const id = info.menuItemId;
                if (id === "caih_asHTML" || id === "caih_asJSON" || id === "pygmalion_example_chat") {
                    chrome.tabs.sendMessage(details.tabId, {
                        name: "DownloadHistory",
                        args: { downloadType: id }
                    })
                }
            })
            cai_downloadhistorymenu__exists = true;
        }
    }
    else if (details.url && details.url.includes("character.ai/chat") && details.url.includes("hist=")) {
        chrome.contextMenus.remove('cai_downloadconversation', AddButtons);
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
                const url = new URL(details.url);
                const searchParams = new URLSearchParams(url.search);
                const historyExtId = searchParams.get('hist');

                const id = info.menuItemId;
                if (id === "cai_conversation") {
                    chrome.tabs.sendMessage(details.tabId, {
                        name: "DownloadConversation",
                        args: { downloadType: id, historyExtId: historyExtId }
                    })
                }
            })
            cai_downloadconversationmenu__exists = true;
        }
    }

    function closeAllMenus() {
        if (cai_downloadhistorymenu__exists) {
            chrome.contextMenus.remove('cai_downloadhistory');
        }
        if (cai_downloadconversationmenu__exists) {
            chrome.contextMenus.remove('cai_downloadconversation');
        }
    }
})