
(() => {

    /*const firstScript = document.getElementsByTagName("script")[0];
    const xhookElement = document.createElement("script");
    xhookElement.id = "xhook";
    xhookElement.src = "https://jpillora.com/xhook/dist/xhook.min.js";
    xhookElement.onload = function () {
        interceptHistories();
    };
    firstScript.parentNode.insertBefore(xhookElement, firstScript);
    */
   
    /*const xhook_lib__url = chrome.runtime.getURL("scripts/xhook.min.js");
    import(xhook_lib__url).then((xhook) => {
        interceptHistories(xhook);
    });
    */
    const xhook_lib__url = chrome.runtime.getURL("scripts/xhook.min.js");
    import(xhook_lib__url).then(() => {
        interceptHistories();
    });
    function interceptHistories() {
        xhook.after((request, response) => {
            try {
                console.log("entered!");
                const HISTORIES_URL = "https://beta.character.ai/chat/character/histories/";
                if (request.url === HISTORIES_URL && response.status === 200) {
                    console.log("truly entered!");
                    const jsonData = JSON.parse(response.text);
                    console.log(jsonData);
                }
            } catch (error) {
                console.log("Error while intercepting -> " + error);
            }
        });
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
            default:
                break;
        }
    });
    const DownloadHistory = async function (dtype) {
        console.log("worked! -> " + dtype);
        /*const currentUrl = new URL(window.location.href);
        const searchParams = new URLSearchParams(currentUrl.search);
        const charID = searchParams.get('char');
        if(!charID){
            return;
        }*/
    }

    const GiveMeSomething = function () {
        console.log("HEY!");
    }
})();