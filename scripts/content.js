


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
                    localStorage.removeItem('cai_histories')
                    localStorage.setItem('cai_histories', JSON.stringify(jsonData));
                }
            }
        });
    }*/

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const { name, args } = obj;
        switch (name) {
            case "DownloadHistory":
                DownloadHistory(args.downloadType);
                break;
            default:
                break;
        }
    });


    function DownloadHistory(dtype) {
        let histories = window.localStorage.getItem('cai_history') != null
            ? JSON.parse(window.localStorage.getItem('cai_history')) //array
            : null;
        let info = window.localStorage.getItem('cai_info') != null
            ? JSON.parse(window.localStorage.getItem('cai_info')) //info object
            : null;
        
        if (histories == null || histories.length < 1 || info == null) {
            return;
        }

        histories = histories.reverse();

        if (dtype === "pygmalion_example_chat") {
            const messageList = [];
            //let messageString = "";
            //messageString += message + "\n";
            histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
                obj.msgs.forEach(msg => {
                    if (msg.src != null && msg.src.name != null && msg.text != null) {
                        const message = msg.src.name + ": " + msg.text;
                        messageList.push(message);
                    }
                });
            });
            const messageString = messageList.join("\n");

            const blob = new Blob([messageString], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            try {
                const charName = info.name.replaceAll(' ', '_');
                link.download = charName + '_Example.txt';;
            } catch (error) {
                link.download = 'ExampleChat.txt';
            }
            link.click();
        }
    }
})();