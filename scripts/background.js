let cai_downloadhistorymenu__exists = false;


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
}
chrome.runtime.onMessage.addListener((obj, sender, sendResponse) => {
    const { name, args } = obj;
    switch (name) {
        case "InterceptHistories":
            chrome.scripting.executeScript({
                target: { tabId: sender.tab.id },
                func: interceptHistories
            });
            break;
        default:
            break;
    }
});


chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
    if (details.url && details.url.includes("character.ai/histories")) {

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
                        args: { downloadType: id }
                    })
                }
            })
            cai_downloadhistorymenu__exists = true;
        }
        /*chrome.tabs.sendMessage(details.tabId, {
            type: "CreateBtns",
            args: { ran: times.toString() }
        });*/
    }
    else {
        if (cai_downloadhistorymenu__exists) {
            chrome.contextMenus.remove('cai_downloadhistory');
        }
        /*chrome.tabs.sendMessage(details.tabId, {
            type: "CheckModal",
            args: { ran: times.toString() }
        });*/
    }
})