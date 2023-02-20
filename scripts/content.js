


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
    /*const interceptHistories = function () {
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

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const { name, args } = obj;
        switch (name) {
            case "DownloadHistory":
                DownloadHistory(args.downloadType);
                break;
            case "GiveMeSomething":
                GiveMeSomething();
                break;
            default:
                break;
        }
    });


    const GiveMeSomething = function () {
        console.log("HEY!");
    }

    function DownloadHistory(dtype) {
        let histories = window.localStorage.getItem('cai_histories') != null
            ? JSON.parse(window.localStorage.getItem('cai_histories')) //array
            : null;
        if (histories != null && histories.length > 0) {
            histories = histories.reverse();
            const chat_histories = [];

            histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
                const msgGroup = [];
                obj.msgs.forEach(msg => {
                    const message = msg.src.name + ": " + msg.text;
                    msgGroup.push(message);
                });
                chat_histories.push(msgGroup);
            });
            console.log(chat_histories);
        }
    }

    /*
        const WatchHistoryRequest = function () {
            console.log("SuccessfullyStarted");
            var origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function () {
                console.log('request started!');
                this.addEventListener('load', function () {
                    console.log('request completed!');
                    console.log(this.readyState); //will always be 4 (ajax is completed successfully)
                    console.log(this.responseText); //whatever the response was
                });
                origOpen.apply(this, arguments);
            };
            console.log("SuccessfullyEnded");
        };
    */
})();