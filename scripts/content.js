


(() => {
    Create_xhook();
    function Create_xhook() {
        if (document.getElementById("xhook")) {
            return;
        }
        const firstScript = document.getElementsByTagName("script")[0];
        const xhook_lib__url = chrome.runtime.getURL("scripts/xhook.min.js");
        const xhookScript = document.createElement("script");
        xhookScript.crossOrigin = "anonymous";
        xhookScript.id = "xhook";
        xhookScript.onload = function () {
        };
        xhookScript.src = xhook_lib__url;
        firstScript.parentNode.insertBefore(xhookScript, firstScript);
    }


    //interceptHistories();
    /* Back up
    const interceptHistories = function () {
        xhook.after(function (request, response) {
            const HISTORIES_URL = "https://beta.character.ai/chat/character/histories/";
            if (request.url === HISTORIES_URL && response.status === 200) {
                const jsonData = JSON.parse(response.text).histories;
                if (jsonData != null && jsonData.length > 0) {
                    sessionStorage.removeItem('cai_histories')
                    sessionStorage.setItem('cai_histories', JSON.stringify(jsonData));
                }
            }
        });
    }*/

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);

        const { name, args } = obj;
        switch (name) {
            case "DownloadHistory":
                if (!window.location.href.includes("character.ai/histories")) {
                    alert("Failed. Works only in histories page.");
                    return;
                }
                const charId = searchParams.get('char');
                DownloadHistory(args.downloadType, charId);
                break;
            /*case "DownloadConversation":
                const historyExtId = searchParams.get('hist');
                DownloadConversation(args.downloadType, historyExtId);
                break;*/
            case "GiveMeSomething":
                console.log(args.something);
                break;
            default:
                break;
        }
    });


    function DownloadHistory(dtype, charId) {
        const historyData = window.sessionStorage.getItem('cai_history_' + charId) != null
            ? JSON.parse(window.sessionStorage.getItem('cai_history_' + charId)) //array
            : null;
        let info = window.sessionStorage.getItem('cai_info_' + charId) != null
            ? JSON.parse(window.sessionStorage.getItem('cai_info_' + charId)) //info object
            : null;

        if (historyData == null || historyData.histories.length < 1 || info == null) {
            alert("failed")
            return;
        }


        if (dtype === "cai_offline_read") {
            DownloadHistory_OfflineReading(historyData, info);
        }
        else if (dtype === "pygmalion_dumper") {
            DownloadHistory_ForFeedingPygmalion(historyData, info);
        }
        else if (dtype === "pygmalion_example_chat") {
            DownloadHistory_PygmalionExampleChat(historyData, info);
        }
    }


    function DownloadHistory_OfflineReading(historyData, info) {
        const histories = historyData.histories;
        console.log(histories);

        let offlineHistory = [];

        let i = 1;
        histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
            let messages = [];

            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    messages.push({
                        messager: msg.src.name,
                        text: msg.text.replaceAll('\n', ' ')
                    });
                });
            offlineHistory.push({ id: i, messages: messages });
            i++;
        });

        var fileUrl = chrome.runtime.getURL('ReadOffline.html');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var fileContents = xhr.responseText;
                fileContents = fileContents.replace('<<<CHAT_RAW_HISTORY>>>', JSON.stringify(offlineHistory));

                var blob = new Blob([fileContents], { type: 'text/html' });
                var url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = info.name != null
                    ? info.name.replaceAll(' ', '_') + '_Offline.html'
                    : 'CAI_ReadOffline.html';
                link.click();
            }
        };
        xhr.send();
    }

    function DownloadHistory_ForFeedingPygmalion(historyData, info) {
        const blob = new Blob([JSON.stringify(historyData)], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = info.name != null
            ? info.name.replaceAll(' ', '_') + '_CaiDump.json'
            : 'CAI_Dump.json';
        link.click();
    }

    function DownloadHistory_PygmalionExampleChat(historyData, info) {
        const histories = historyData.histories.reverse();
        const messageList = [];
        //let messageString = "";
        //messageString += message + "\n";
        histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    const message = msg.src.name + ": " + msg.text.replaceAll('\n', ' ');
                    messageList.push(message);
                });
        });
        const messageString = messageList.join("\n");

        const blob = new Blob([messageString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = info.name != null
            ? info.name.replaceAll(' ', '_') + '_Example.txt'
            : 'ExampleChat.txt';
        link.click();
    }



    /*function DownloadConversation(dtype, historyExtId) {
        let conversation = window.sessionStorage.getItem('cai_conversation_' + historyExtId) != null
            ? JSON.parse(window.sessionStorage.getItem('cai_conversation_' + historyExtId))
            : null;
        console.log(conversation)
        if (dtype === 'cai_conversation') {

        }
    }*/
})();