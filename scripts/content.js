


(() => {

    Create_xhook();
    function Create_xhook(){
        if (document.getElementById("xhook")) {
            return;
        }
        const firstScript = document.getElementsByTagName("script")[0];
        const xhook_lib__url = chrome.runtime.getURL("scripts/xhook.min.js");
        const xhookScript = document.createElement("script");
        xhookScript.id = "xhook";
        xhookScript.onload = function () {
            interceptHistories();
        };
        xhookScript.src = xhook_lib__url;
        firstScript.parentNode.insertBefore(xhookScript, firstScript);
    }
    const interceptHistories = function () {
        xhook.after((request, response) => {
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
        })
    }

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const { type, utility } = obj;
        switch (type) {
            case "DownloadHistory":
                DownloadHistory(utility.downloadType);
                break;
            case "GiveMeSomething":
                GiveMeSomething();
                break;
            case "WatchHistoryRequest":
                break;
            default:
                break;
        }
    });


    const GiveMeSomething = function () {
        console.log("HEY!");
    }

    const DownloadHistory = async function (dtype) {
        console.log("worked! -> " + dtype);
        /*const currentUrl = new URL(window.location.href);
        const searchParams = new URLSearchParams(currentUrl.search);
        const charID = searchParams.get('char');
        if(!charID){
            return;
        }*/
    }


    const WatchHistoryRequest = function(){
        console.log("SuccessfullyStarted");
        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function() {
            console.log('request started!');
            this.addEventListener('load', function() {
                console.log('request completed!');
                console.log(this.readyState); //will always be 4 (ajax is completed successfully)
                console.log(this.responseText); //whatever the response was
            });
            origOpen.apply(this, arguments);
        };
        console.log("SuccessfullyEnded");
    };
})();