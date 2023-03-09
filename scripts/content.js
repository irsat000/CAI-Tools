

(() => {
    const firstScript = document.getElementsByTagName("script")[0];
    const xhook_lib__url = chrome.runtime.getURL("scripts/xhook.min.js");
    const xhookScript = document.createElement("script");
    xhookScript.crossOrigin = "anonymous";
    xhookScript.id = "xhook";
    xhookScript.onload = function () {
        //maybe for later
    };
    xhookScript.src = xhook_lib__url;
    firstScript.parentNode.insertBefore(xhookScript, firstScript);

    chrome.runtime.onMessage.addListener((obj, sender, response) => {
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);

        const { name, args } = obj;
        if (name === "DownloadCAIHistory") {
            if (!window.location.href.includes("character.ai/histories")) {
                alert("Failed. Works only in histories page.");
                return;
            }
            const charId = searchParams.get('char');
            const historyData = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_history') != null
                ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_history'))
                : null;
            const charInfo = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_info') != null
                ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_info'))
                : null;

            if (historyData == null || historyData.histories.length < 1 || charInfo == null) {
                alert("Data is not ready. Try again later.")
                return;
            }

            const character_name = historyData.histories.reverse()
                .flatMap(obj => obj.msgs.filter(msg => msg.src != null && msg.src.is_human === false && msg.src.name != null))
                .find(msg => msg.src.name !== null)?.src.name ?? null;

            const dtype = args.downloadType;
            switch (dtype) {
                case "cai_offline_read":
                    console.log(historyData);
                    DownloadHistory_OfflineReading(historyData, character_name);
                    break;
                case "cai_dump":
                    DownloadHistory_AsDump(historyData, charInfo, dtype, character_name);
                    //If not registered, askToCreateCharacter should be true
                    if (window.sessionStorage.getItem('askToCreateCharacter') !== "false") {
                        let createCharacter = confirm("Would you like to create a character for other AIs?");
                        if (createCharacter === true) {
                            window.open("https://zoltanai.github.io/character-editor/", "_blank");
                        } else {
                            window.sessionStorage.setItem('askToCreateCharacter', 'false');
                        }
                    }
                    break;
                case "cai_dump_anon":
                    DownloadHistory_AsDump(historyData, charInfo, dtype, character_name);
                    //If not registered, askToFeedPygmalion should be true
                    if (window.sessionStorage.getItem('askToFeedPygmalion') !== "false") {
                        let trainPygmalion = confirm("Would you like to train Pygmalion AI with this dump?");
                        if (trainPygmalion === true) {
                            window.open("https://dump.nopanda.io/", "_blank");
                        } else {
                            window.sessionStorage.setItem('askToFeedPygmalion', 'false');
                        }
                    }
                    break;
                case "example_chat":
                    console.log(historyData);
                    DownloadHistory_ExampleChat(historyData, character_name);
                    break;
                default:
                    break;
            }
        }
        else if (name === "DownloadCharSettings") {
            if (!window.location.href.includes("character.ai/histories")) {
                alert("Failed. Works only in histories page.");
                return;
            }

            const charId = searchParams.get('char');
            const settingsData = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_info') != null
                ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_info'))
                : null;

            if (settingsData == null || settingsData.character == null) {
                alert("Data is not ready. Try again later.")
                return;
            }

            console.log(settingsData);

            const dtype = args.downloadType;
            switch (dtype) {
                case "cai_settings_view":
                    DownloadSettings_View(settingsData);
                    break;
                /*case "cai_settings_json":
                    DownloadSettings_JSON(settingsData);*/
                    break;
                default:
                    break;
            }
        }
        /*else if (name === "DownloadConversation"){
            const historyExtId = searchParams.get('hist');
            DownloadConversation(args.downloadType, historyExtId);
        }*/
    });

    function DownloadSettings_View(settingsData) {
        var fileUrl = chrome.runtime.getURL('ReadCharSettings.html');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var fileContents = xhr.responseText;
                fileContents = fileContents.replace(
                    '<<<CHARACTER_SETTINGS>>>',
                    JSON.stringify(settingsData)
                );

                var blob = new Blob([fileContents], { type: 'text/html' });
                var url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = settingsData.character.name.replaceAll(' ', '_') + '_CaiSettings.html';
                link.click();
            }
        };
        xhr.send();
    }

    /* No need for this
    function DownloadSettings_JSON(settingsData) {
        const Data_FinalForm = JSON.stringify(settingsData);
        const blob = new Blob([Data_FinalForm], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = settingsData.character.name.replaceAll(' ', '_') + '_CaiSettings.json';
        link.click();
    }*/



    function DownloadHistory_OfflineReading(historyData, character_name) {
        const histories = historyData.histories;

        let offlineHistory = [];

        let i = 1;
        histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
            let messages = [];

            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    messages.push({
                        messager: msg.src.name,
                        text: encodeURIComponent(msg.text)
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
                fileContents = fileContents.replace(
                    '<<<CHAT_RAW_HISTORY>>>',
                    JSON.stringify(offlineHistory)
                );

                var blob = new Blob([fileContents], { type: 'text/html' });
                var url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = character_name != null
                    ? character_name.replaceAll(' ', '_') + '_Offline.html'
                    : 'CAI_ReadOffline.html';
                link.click();
            }
        };
        xhr.send();
    }

    function DownloadHistory_AsDump(historyData, charInfo, dtype, character_name) {

        if (dtype === "cai_dump_anon") {
            historyData.histories.filter(h => h.msgs != null && h.msgs.length > 1).forEach(history => {
                history.msgs.forEach(msg => {
                    if (msg.src.is_human === true) {
                        msg.src.name = "pseudo";
                        msg.src.user.username = "pseudo";
                        msg.src.user.first_name = "pseudo";
                        msg.src.user.id = 1;
                        msg.src.user.account.avatar_file_name = "";
                        msg.src.user.account.name = "pseudo";
                        msg.display_name = "pseudo";
                    }
                    if (msg.tgt.is_human === true) {
                        msg.tgt.name = "pseudo";
                        msg.tgt.user.username = "pseudo";
                        msg.tgt.user.first_name = "pseudo";
                        msg.tgt.user.id = 1;
                        msg.tgt.user.account.avatar_file_name = "";
                        msg.tgt.user.account.name = "pseudo";
                    }
                })
            })
            charInfo.character.user__username = "[Your_Nickname]";
        }

        const CharacterDump = {
            info: charInfo,
            histories: historyData,
        };
        console.log(CharacterDump);

        const Data_FinalForm = JSON.stringify(CharacterDump);
        const blob = new Blob([Data_FinalForm], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        if (dtype === "cai_dump_anon") {
            link.download = character_name != null
                ? character_name.replaceAll(' ', '_') + '_CaiDumpAnon.json'
                : 'CAI_Dump_Anon.json';
        } else {
            link.download = character_name != null
                ? character_name.replaceAll(' ', '_') + '_CaiDump.json'
                : 'CAI_Dump.json';
        }

        link.click();
    }

    function DownloadHistory_ExampleChat(historyData, character_name) {
        const histories = historyData.histories.reverse();
        const messageList = [];
        histories.filter(v => v.msgs != null && v.msgs.length > 1).forEach(obj => {
            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    const message = msg.src.name + ": " + removeSpecialChars(msg.text);
                    messageList.push(message);
                });
        });
        const messageString = messageList.join("\n");

        const blob = new Blob([messageString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = character_name != null
            ? character_name.replaceAll(' ', '_') + '_Example.txt'
            : 'ExampleChat.txt';
        link.click();
    }

    function removeSpecialChars(str) {
        return str
            .replace(/[\\]/g, ' ')
            .replace(/[\"]/g, ' ')
            .replace(/[\/]/g, ' ')
            .replace(/[\b]/g, ' ')
            .replace(/[\f]/g, ' ')
            .replace(/[\n]/g, ' ')
            .replace(/[\r]/g, ' ')
            .replace(/[\t]/g, ' ');
    };


    /*function DownloadConversation(dtype, historyExtId) {
        let conversation = window.localStorage.getItem('cai_conversation_' + historyExtId) != null
            ? JSON.parse(window.localStorage.getItem('cai_conversation_' + historyExtId))
            : null;
        console.log(conversation)
        if (dtype === 'cai_conversation') {

        }
    }*/
})();
