

(() => {
    const extensionAPI = browser;

    const metadata = {
        version: 1,
        created: Date.now(),
        modified: Date.now(),
        source: null,
        tool: {
            name: "CAI Tools",
            version: "1.5.2",
            url: "https://www.github.com/irsat000/CAI-Tools"
        }
    };


    const xhook_lib__url = extensionAPI.runtime.getURL("scripts/xhook.min.js");
    const xhookScript = document.createElement("script");
    xhookScript.crossOrigin = "anonymous";
    xhookScript.id = "xhook";
    xhookScript.onload = function () {
        initialize_options_DOM();
    };
    xhookScript.src = xhook_lib__url;
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(xhookScript, firstScript);


    extensionAPI.runtime.onMessage.addListener((obj, sender, response) => {
        const { name, args } = obj;
        if (name === "Create_Options_DOM") {
            initialize_options_DOM();
        }
        else if (name === "Reset_Modal") {
            handleProgressInfoMeta(`(Loading...)`);
        }
    });



    // FETCH MESSAGES

    function handleProgressInfoMeta(text) {
        if (document.querySelector('meta[cai_progressinfo]')) {
            document.querySelector('meta[cai_progressinfo]')
                .setAttribute('cai_progressinfo', text);
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cai_progressinfo', text);
            document.head.appendChild(meta);
        }
    }

    function createFetchStartedMeta_Conversation(text, extId) {
        if (document.querySelector('meta[cai_fetchStarted_conver][cai_fetchStatusExtId="' + extId + '"]')) {
            document.querySelector('meta[cai_fetchStarted_conver][cai_fetchStatusExtId="' + extId + '"]')
                .setAttribute('cai_fetchStarted_conver', text);
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cai_fetchStarted_conver', text);
            meta.setAttribute('cai_fetchStatusExtId', extId);
            document.head.appendChild(meta);
        }
    }

    function createFetchStartedMeta(text) {
        const charId = getCharId();
        if (charId == null) {
            return;
        }
        if (document.querySelector('meta[cai_fetchStarted][cai_fetchStatusCharId="' + charId + '"]')) {
            document.querySelector('meta[cai_fetchStarted][cai_fetchStatusCharId="' + charId + '"]')
                .setAttribute('cai_fetchStarted', text);
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cai_fetchStarted', text);
            meta.setAttribute('cai_fetchStatusCharId', charId);
            document.head.appendChild(meta);
        }
    }

    let fetchedChatNumber = 1;

    const fetchMessages = async ({ fetchDataType, nextPage, AccessToken, chatExternalId, chat, chatsLength, converList }) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        let url = `https://beta.character.ai/chat/history/msgs/user/?history_external_id=${chatExternalId}`;
        if (nextPage > 0) {
            url += `&page_num=${nextPage}`;
        }
        await fetch(url, {
            method: "GET",
            headers: {
                "authorization": AccessToken
            }
        })
            .then((res) => res.json())
            .then(async (data) => {
                console.log(nextPage);

                if (fetchDataType === "history") {
                    let newMsgGroup = [];
                    data.messages.forEach(message => {
                        let newMessage = {
                            annotatable: true,
                            created: chat.created,
                            display_name: message.src__name,
                            id: message.id,
                            image_rel_path: message.image_rel_path,
                            is_alternative: message.is_alternative,
                            src: {
                                is_human: message.src__is_human,
                                name: message.src__name,
                                num_interactions: 1,
                                user: {
                                    account: null,
                                    first_name: message.src__name,
                                    id: 1,
                                    is_staff: false,
                                    username: message.src__user__username
                                }
                            },
                            text: message.text,
                            tgt: {
                                is_human: !message.src__is_human,
                                name: message.tgt,
                                num_interactions: 1,
                                user: {
                                    account: null,
                                    first_name: message.tgt,
                                    id: 1,
                                    is_staff: false,
                                    username: message.tgt
                                }
                            }
                        };
                        newMsgGroup.push(newMessage);
                    });

                    chat.msgs = chat.msgs.length > 0
                        ? [...newMsgGroup, ...chat.msgs]
                        : newMsgGroup;
                }
                else if (fetchDataType === "conversation") {
                    converList = converList.length > 0
                        ? [...data.messages, ...converList]
                        : data.messages;
                }

                if (data.has_more) {
                    await fetchMessages({
                        fetchDataType: fetchDataType,
                        nextPage: data.next_page,
                        AccessToken: AccessToken,
                        chatExternalId: chatExternalId,
                        chat: chat,
                        chatsLength: chatsLength,
                        converList: converList
                    });
                }
                else if (fetchDataType === "history") {
                    handleProgressInfoMeta(`(Loading... Chat ${fetchedChatNumber}/${chatsLength} completed)`);
                    fetchedChatNumber++;
                }
                else if (fetchDataType === "conversation") {
                    if (converList.length > 0) {
                        console.log("FINISHED");
                        if (document.querySelector(`meta[cai_converExtId="${chatExternalId}"]`)) {
                            document.querySelector(`meta[cai_converExtId="${chatExternalId}"]`)
                                .setAttribute('cai_conversation', JSON.stringify(converList));
                        }
                        else {
                            const meta = document.createElement('meta');
                            meta.setAttribute('cai_converExtId', chatExternalId);
                            meta.setAttribute('cai_conversation', JSON.stringify(converList));
                            document.head.appendChild(meta);
                        }
                        handleProgressInfoMeta(`(Ready!)`);
                    }
                }
            })
            .catch(async (err) => {
                console.log("Error. Will try again after 10 seconds.");
                await new Promise(resolve => setTimeout(resolve, 10000));
                return await fetchMessages({
                    fetchDataType: fetchDataType,
                    nextPage: nextPage,
                    AccessToken: AccessToken,
                    chatExternalId: chatExternalId,
                    chat: chat,
                    chatsLength: chatsLength,
                    converList: converList
                });
            });
    };

    const fetchHistory = async (charId) => {
        createFetchStartedMeta("true");
        const jsonData = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_temphistory') != null
            ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_temphistory'))
            : null;
        const AccessToken = getAccessToken();

        if (jsonData != null && AccessToken != null) {
            const chatsLength = jsonData.histories.length;
            for (const chat of jsonData.histories) {
                chat.msgs = [];
                const chatExternalId = chat.external_id;
                await fetchMessages({
                    fetchDataType: "history",
                    nextPage: 0,
                    AccessToken: AccessToken,
                    chatExternalId: chatExternalId,
                    chat: chat,
                    chatsLength: chatsLength,
                    converList: null
                });
            }
            console.log(jsonData);
            console.log("FINISHED");
            if (document.querySelector('meta[cai_charid="' + charId + '"]')) {
                document.querySelector('meta[cai_charid="' + charId + '"]')
                    .setAttribute('cai_history', JSON.stringify(jsonData));
            }
            else {
                const meta = document.createElement('meta');
                meta.setAttribute('cai_charid', charId);
                meta.setAttribute('cai_history', JSON.stringify(jsonData));
                document.head.appendChild(meta);
            }
            handleProgressInfoMeta(`(Ready!)`);
        } else {
            createFetchStartedMeta("false");
            alert("Failed to intercept CAI. Try reloading.");
        }
    };

    const fetchConversation = async (converExtId) => {
        createFetchStartedMeta_Conversation("true", converExtId);
        const AccessToken = getAccessToken();
        let converList = [];
        await fetchMessages({
            fetchDataType: "conversation",
            nextPage: 0,
            AccessToken: AccessToken,
            chatExternalId: converExtId,
            chat: null,
            chatsLength: null,
            converList: converList
        });
    }

    // FETCH END


    // CAI Tools - DOM

    function initialize_options_DOM() {
        if (window.location.href.includes("character.ai/histories")) {
            let ch_header = document.querySelector('.home-sec-header');
            const intervalId = setInterval(() => {
                ch_header = document.querySelector('.home-sec-header');
                if (ch_header != null) {
                    clearInterval(intervalId);
                    create_options_DOM_History(ch_header);
                }
            }, 1000);
        }
        else if (window.location.href.includes("character.ai/chat")) {
            let ch_header = document.querySelector('.chattop');
            let currentConverExtIdMeta = document.querySelector(`meta[cai_currentConverExtId]`);

            const intervalId = setInterval(() => {
                ch_header = document.querySelector('.chattop');
                currentConverExtIdMeta = document.querySelector(`meta[cai_currentConverExtId]`);
                if (ch_header != null && currentConverExtIdMeta != null) {
                    clearInterval(intervalId);
                    create_options_DOM_Conversation(ch_header);
                }
            }, 1000);
        }
    }

    function create_options_DOM_Conversation(ch_header) {
        //check if already exists
        if (ch_header.querySelector('.cai_tools-btn')) {
            return;
        }

        //Create cai tools in dom
        const cai_tools_string = `
            <button class="cai_tools-btn">CAI Tools</button>
            <div class="cai_tools-cont">
                <div class="cai_tools">
                    <div class="cait-header">
                        <h4>CAI Tools</h4><span class="cait-close">x</span>
                    </div>
                    <div class="cait-body">
                        <span class="cait_warning"></span>
                        <h6>Character</h6>
                        <ul>
                            <li data-cait_type='character_hybrid'>Download Character (json)</li>
                            <li data-cait_type='character_card'>Download Character Card (png)</li>
                            <li data-cait_type='character_settings'>Show settings</li>
                        </ul>
                        <h6>This conversation</h6>
                        <span class='cait_progressInfo'>(Loading...)</span>
                        <ul>
                            <li data-cait_type='oobabooga'>Download as Oobabooga chat</li>
							<li data-cait_type='tavern'>Download as Tavern chat</li>
                            <li data-cait_type='example_chat'>Download as example chat/definition</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="cait_settings-cont">
                <div class="cait_settings">
                    <div class="caits_header">
                        <h4>Settings</h4><span class="caits-close">x</span>
                    </div>
                    <div class="caits-body">
                        <pre id="cait_jsonViewer"></pre>
                    </div>
                </div>
            </div>
        `;
        ch_header.appendChild(parseHTML(cai_tools_string));

        //open modal upon click on btn
        const currentConverExtId = document.querySelector('meta[cai_currentConverExtId]').getAttribute('cai_currentConverExtId');
        const checkExistingConver = document.querySelector(`meta[cai_converExtId="${currentConverExtId}"]`);
        ch_header.querySelector('.cai_tools-btn').addEventListener('click', () => {
            ch_header.querySelector('.cai_tools-cont').classList.add('active');


            const fetchStarted = document.querySelector(`meta[cai_fetchStarted_conver][cai_fetchStatusExtId="${currentConverExtId}"]`)
                ?.getAttribute('cai_fetchStarted_conver');
            if ((checkExistingConver == null || checkExistingConver.getAttribute('cai_conversation') == null) && fetchStarted !== "true") {
                fetchConversation(currentConverExtId);
            }
        });

        //close modal
        ch_header.querySelector('.cai_tools-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cai_tools-cont') || target.classList.contains('cait-close')) {
                close_caiToolsModal(ch_header);
            }
        });
        ch_header.querySelector('.cait_settings-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_settings-cont') || target.classList.contains('caits-close')) {
                close_caitSettingsModal(ch_header);
            }
        });

        const converStatusInterval = setInterval(() => {
            if (checkExistingConver != null && checkExistingConver.getAttribute('cai_conversation') != null) {
                ch_header.querySelector('.cai_tools-cont .cait_progressInfo').textContent = '(Ready!)';
                clearInterval(converStatusInterval);
                return;
            }
            const converStatus = document.querySelector(`meta[cai_progressinfo]`);
            if (converStatus != null) {
                const converStatusText = converStatus.getAttribute('cai_progressinfo');
                ch_header.querySelector('.cai_tools-cont .cait_progressInfo').textContent = converStatusText;
                if (converStatusText === '(Ready!)') {
                    clearInterval(converStatusInterval);
                }
            }
        }, 1000);


        ch_header.querySelector('.cai_tools-cont [data-cait_type="character_hybrid"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_hybrid' };
            DownloadCharacter(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="character_card"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_card' };
            DownloadCharacter(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="character_settings"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_settings' };
            DownloadCharacter(args);
            close_caiToolsModal(ch_header);
        });

        ch_header.querySelector('.cai_tools-cont [data-cait_type="oobabooga"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'oobabooga' };
            DownloadConversation(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="tavern"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'tavern' };
            DownloadConversation(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'example_chat' };
            DownloadConversation(args);
            close_caiToolsModal(ch_header);
        });
    }

    function create_options_DOM_History(ch_header) {
        const charId = getCharId();

        //check if already exists
        if (ch_header.querySelector('.cai_tools-btn')) {
            return;
        }

        //Create cai tools in dom
        const cai_tools_string = `
            <button class="cai_tools-btn">CAI Tools</button>
            <div class="cai_tools-cont">
                <div class="cai_tools">
                    <div class="cait-header">
                        <h4>CAI Tools</h4><span class="cait-close">x</span>
                    </div>
                    <div class="cait-body">
                        <span class="cait_warning"></span>
                        <h6>History</h6>
                        <span class='cait_progressInfo'>(Loading...)</span>
                        <ul>
                            <li data-cait_type='cai_offline_read'>Download to read offline</li>
                            <li data-cait_type='example_chat'>Download as example chat (txt)</li>
                            <li data-cait_type='cai_dump'>Raw Dump (json)</li>
                            <li data-cait_type='cai_dump_anon'>Raw Dump (anonymous)</li>
                            <li data-cait_type='cai_tavern_history'>Tavern Chats (zip/jsonl)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        /*
            <h6>Misc</h6>
            <ul>
                <li data-cait_type=''>)</li>
            </ul>
        */
        ch_header.appendChild(parseHTML(cai_tools_string));

        const historyMeta = document.querySelector(`meta[cai_charid="${charId}"][cai_history]`);

        //open modal upon click on btn
        ch_header.querySelector('.cai_tools-btn').addEventListener('click', () => {
            ch_header.querySelector('.cai_tools-cont').classList.add('active');

            const fetchStarted = document.querySelector(`meta[cai_fetchStarted][cai_fetchStatusCharId="${charId}"]`)
                ?.getAttribute('cai_fetchStarted');
            if ((historyMeta == null || historyMeta.getAttribute('cai_history') == null) && fetchStarted !== "true") {
                fetchedChatNumber = 1;
                fetchHistory(charId);
            }
        });

        //close modal
        ch_header.querySelector('.cai_tools-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cai_tools-cont') || target.classList.contains('cait-close')) {
                close_caiToolsModal(ch_header);
            }
        });

        const histStatusInterval = setInterval(() => {
            if (historyMeta != null && historyMeta.getAttribute('cai_history') != null) {
                ch_header.querySelector('.cai_tools-cont .cait_progressInfo').textContent = '(Ready!)';
                clearInterval(histStatusInterval);
                return;
            }
            const histStatus = document.querySelector(`meta[cai_progressinfo]`);
            if (histStatus != null) {
                const histStatusText = histStatus.getAttribute('cai_progressinfo');
                ch_header.querySelector('.cai_tools-cont .cait_progressInfo').textContent = histStatusText;
                if (histStatusText === '(Ready!)') {
                    clearInterval(histStatusInterval);
                }
            }
        }, 1000);


        ch_header.querySelector('.cai_tools-cont [data-cait_type="cai_offline_read"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_offline_read' };
            DownloadHistory(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'example_chat' };
            DownloadHistory(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="cai_dump"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_dump' };
            DownloadHistory(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="cai_dump_anon"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_dump_anon' };
            DownloadHistory(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="cai_tavern_history"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_tavern_history' };
            DownloadHistory(args);
            close_caiToolsModal(ch_header);
        });

    }

    function close_caiToolsModal(container) {
        container.querySelector('.cai_tools-cont').classList.remove('active');
    }
    function close_caitSettingsModal(container) {
        container.querySelector('.cait_settings-cont').classList.remove('active');
    }
    // CAI Tools - DOM - END





    // CONVERSATION
    function DownloadConversation(args) {
        const chatData = document.querySelector(`meta[cai_converExtId="${args.extId}"]`)?.getAttribute('cai_conversation') != null
            ? JSON.parse(document.querySelector(`meta[cai_converExtId="${args.extId}"]`).getAttribute('cai_conversation'))
            : null;

        if (chatData == null) {
            alert("Data is empty or not ready. Try again later.")
            return;
        }

        switch (args.downloadType) {
            case "oobabooga":
                DownloadConversation_Oobabooga(chatData, args);
                break;
            case "tavern":
                DownloadConversation_Tavern(chatData, args);
                break;
            case "example_chat":
                DownloadConversation_ChatExample(chatData, args);
                break;
            default:
                break;
        }
        console.log(chatData);
    }

    function DownloadConversation_Oobabooga(chatData, args) {
        const ChatObject = {
            data: [],
            data_visible: [],
        };
        chatData.shift();
        let currentPair = [];
        chatData.filter(msg => msg.is_alternative === false)
            .forEach((msg, index) => {
                if (index % 2 == 0) {
                    currentPair = [];
                    currentPair.push(msg.text);
                }
                else {
                    currentPair.push(msg.text);
                    ChatObject.data.push(currentPair);
                    ChatObject.data_visible.push(currentPair);
                }
            });

        const Data_FinalForm = JSON.stringify(ChatObject);
        const blob = new Blob([Data_FinalForm], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${args.extId.substring(0, 8)}_${args.downloadType}_Chat.json`;
        link.click();
    }

    function DownloadConversation_Tavern(chatData, args) {
        if (chatData.length <= 1) {
            alert("The conversation is empty.")
            return;
        }
        const blob = CreateTavernChatBlob(chatData);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${args.extId.substring(0, 8)}_${args.downloadType}_Chat.jsonl`;
        link.click();
    }

    function DownloadConversation_ChatExample(chatData, args) {
        const messageList = [];
        messageList.push("<START>");
        chatData.filter(msg => msg.is_alternative === false)
            .forEach(msg => {
                const user = msg.src__is_human ? "user" : "char";
                const message = `{{${user}}}: ${msg.text}`;
                messageList.push(message);
            });
        const chatString = messageList.join("\n");

        const blob = new Blob([chatString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${args.extId.substring(0, 8)}_Example.txt`;
        link.click();
    }

    // HISTORY

    function DownloadHistory(args) {
        const charId = getCharId();
        const historyData = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_history') != null
            ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_history'))
            : null;
        const charInfo = document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_info') != null
            ? JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]').getAttribute('cai_info'))
            : null;

        if (historyData == null || historyData.histories.length < 1 || charInfo == null) {
            alert("Data is empty or not ready. Try again later.")
            return;
        }

        const character_name = historyData.histories.reverse()
            .flatMap(obj => obj.msgs.filter(msg => msg.src != null && msg.src.is_human === false && msg.src.name != null))
            .find(msg => msg.src.name !== null)?.src.name ?? null;

        const dtype = args.downloadType;
        switch (dtype) {
            case "cai_offline_read":
                DownloadHistory_OfflineReading(historyData, character_name);
                break;
            case "cai_dump":
                DownloadHistory_AsDump(historyData, charInfo, dtype, character_name);
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
                DownloadHistory_ExampleChat(historyData, character_name);
                break;
            case "cai_tavern_history":
                DownloadHistory_TavernHistory(historyData, character_name);
                break;
            default:
                break;
        }
    }

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

        var fileUrl = extensionAPI.runtime.getURL('ReadOffline.html');
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
                        if (msg.src.user.account) {
                            msg.src.user.account.avatar_file_name = "";
                            msg.src.user.account.name = "pseudo";
                        }
                        msg.display_name = "pseudo";
                    }
                    if (msg.tgt.is_human === true) {
                        msg.tgt.name = "pseudo";
                        msg.tgt.user.username = "pseudo";
                        msg.tgt.user.first_name = "pseudo";
                        msg.tgt.user.id = 1;
                        if (msg.tgt.user.account) {
                            msg.tgt.user.account.avatar_file_name = "";
                            msg.tgt.user.account.name = "pseudo";
                        }
                    }
                })
            })
            charInfo.character.user__username = "[Your_Nickname]";
        }

        const CharacterDump = {
            info: charInfo,
            histories: historyData,
        };

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
            messageList.push("<START>");
            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    const user = msg.src.is_human ? "user" : "char";
                    const message = `{{${user}}}: ${msg.text}`;
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


    function DownloadHistory_TavernHistory(historyData, character_name) {
        const histories = historyData.histories.reverse();
        const char_id = getCharId();
        const zip = new JSZip();

        let count = 0;
        const filePromises = histories.filter(v => v.msgs != null && v.msgs.length > 1).map(async (chat, index) => {
            count = index + 1;
            const blob = CreateTavernChatBlob(chat.msgs);
            const arraybuffer = await readAsBinaryString(blob);
            zip.file(`chat_${index + 1}.jsonl`, arraybuffer, {binary: true});
        });

        Promise.all(filePromises).then(() => {
            if (count === 0) {
                alert("History have no messages.");
                return;
            }
            zip.generateAsync({ type: 'blob' }).then(function (content) {
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = character_name != null
                    ? `${character_name}_TavernHistory.zip`
                    : `${char_id.substring(0, 8)}.zip`;
                link.click();
            });
        });
    }

    function readAsBinaryString(blob) {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function (event) {
                resolve(event.target.result);
            };
            reader.readAsBinaryString(blob);
        });
    }
    //HISTORY - END




    // CHARACTER DOWNLOAD

    function DownloadCharacter(args) {
        const fetchUrl = "https://beta.character.ai/chat/character/";
        const AccessToken = getAccessToken();
        const charId = getCharId();
        const payload = { external_id: charId }
        if (AccessToken != null && charId != null) {
            fetchCharacterInfo(fetchUrl, AccessToken, payload, args.downloadType);
        }
        else {
            alert("Couldn't find current user or character id.");
        }
    }

    function fetchCharacterInfo(fetchUrl, AccessToken, payload, downloadType) {
        fetch(fetchUrl, {
            method: "POST",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "authorization": AccessToken
            },
            body: JSON.stringify(payload)
        })
            .then((res) => res.json())
            .then((data) => {
                console.log(data);
                //Permission check
                if (data.character.length === 0) {
                    // No permission because it's someone else's character
                    const newUrl = "https://beta.character.ai/chat/character/info/";
                    // To guarantee running once
                    if (fetchUrl != newUrl) {
                        fetchCharacterInfo(newUrl, AccessToken, payload, downloadType);
                    }
                    return;
                }

                if (downloadType === "cai_character_hybrid") {
                    const hybridCharacter = {
                        char_name: data.character.name,
                        char_persona: data.character.description,
                        char_greeting: data.character.greeting,
                        world_scenario: "",
                        example_dialogue: data.character.definition ?? "",

                        name: data.character.name,
                        description: data.character.description,
                        first_mes: data.character.greeting,
                        scenario: "",
                        mes_example: data.character.definition ?? "",
                        personality: data.character.title,

                        metadata: metadata
                    }

                    const Data_FinalForm = JSON.stringify(hybridCharacter);
                    const blob = new Blob([Data_FinalForm], { type: 'text/json' });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = data.character.name.replaceAll(' ', '_') + '.json';
                    link.click();
                }
                else if (downloadType === "cai_character_card") {
                    if (data.character.avatar_file_name == null ||
                        data.character.avatar_file_name == "" ||
                        data.character.avatar_file_name.length == 0
                    ) {
                        alert("Only works on characters who have an avatar.")
                        return;
                    }

                    const cardCharacter = {
                        name: data.character.name,
                        description: data.character.description,
                        first_mes: data.character.greeting,
                        scenario: "",
                        mes_example: data.character.definition ?? "",
                        personality: data.character.title,

                        metadata: metadata
                    }

                    const avatarLink = `https://characterai.io/i/400/static/avatars/${data.character.avatar_file_name}`;

                    const charInfo = JSON.stringify(cardCharacter, undefined, '\t');

                    fetch(avatarLink)
                        .then(res => res.blob())
                        .then(avifBlob => {
                            const img = new Image();
                            const objectURL = URL.createObjectURL(avifBlob);
                            img.src = objectURL;

                            img.onload = function () {
                                // Create a canvas element
                                const canvas = document.createElement("canvas");
                                canvas.width = img.width;
                                canvas.height = img.height;

                                // Draw the AVIF image onto the canvas
                                const ctx = canvas.getContext("2d");
                                ctx.drawImage(img, 0, 0);

                                // Convert canvas content to PNG Blob
                                canvas.toBlob(canvasBlob => {
                                    const fileReader = new FileReader();
                                    fileReader.onload = function (event) {
                                        const chunks = extractChunks(new Uint8Array(event.target.result)).filter(x => x.name !== 'tEXt');

                                        // Create new tEXt chunk
                                        const keyword = [99, 104, 97, 114, 97]; // "chara" in ASCII
                                        const encodedValue = btoa(new TextEncoder().encode(charInfo).reduce((a, b) => a + String.fromCharCode(b), ''));
                                        const valueBytes = [];
                                        for (let i = 0; i < encodedValue.length; i++) {
                                            valueBytes.push(encodedValue.charCodeAt(i));
                                        }
                                        const tEXtChunk = {
                                            name: 'tEXt',
                                            data: new Uint8Array([...keyword, 0, ...valueBytes])
                                        };

                                        // Find the index of 'IEND'
                                        const iendIndex = chunks.findIndex(obj => obj.name === 'IEND');

                                        // Insert the new tEXt before 'IEND'
                                        chunks.splice(iendIndex, 0, tEXtChunk);

                                        // Combine
                                        const combinedData = [];
                                        // Signature
                                        combinedData.push(...[137, 80, 78, 71, 13, 10, 26, 10]);
                                        chunks.forEach(chunk => {
                                            const length = chunk.data.length;
                                            const lengthBytes = new Uint8Array(4);
                                            lengthBytes[0] = (length >> 24) & 0xFF;
                                            lengthBytes[1] = (length >> 16) & 0xFF;
                                            lengthBytes[2] = (length >> 8) & 0xFF;
                                            lengthBytes[3] = length & 0xFF;

                                            const type = chunk.name.split('').map(char => char.charCodeAt(0));

                                            const crc = CRC32.buf(chunk.data, CRC32.str(chunk.name));

                                            const crcBytes = new Uint8Array(4);
                                            crcBytes[0] = (crc >> 24) & 0xFF;
                                            crcBytes[1] = (crc >> 16) & 0xFF;
                                            crcBytes[2] = (crc >> 8) & 0xFF;
                                            crcBytes[3] = crc & 0xFF;

                                            combinedData.push(...lengthBytes, ...type, ...chunk.data, ...crcBytes);
                                        });

                                        // Download
                                        const newDataBlob = new Blob([new Uint8Array(combinedData).buffer], { type: 'image/png' });
                                        const link = document.createElement('a');
                                        link.href = URL.createObjectURL(newDataBlob);
                                        link.download = data.character.name ?? 'character_card.png';
                                        link.click();
                                    };
                                    fileReader.readAsArrayBuffer(canvasBlob);
                                }, "image/png");
                            };
                        })
                        .catch(err => {
                            console.error('Error while fetching avatar.');
                        });
                }
                else if (downloadType === "cai_character_settings") {
                    const viewerPre = document.getElementById("cait_jsonViewer");
                    if (viewerPre) {
                        viewerPre.innerHTML = "";

                        for (let prop in data.character) {
                            if (data.character.hasOwnProperty(prop)) {
                                const line = `<span class="cait_jv_prop">${prop}:</span> ${data.character[prop]}\r\n`;
                                viewerPre.innerHTML += line.replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
                                viewerPre.innerHTML += "<br />";
                            }
                        }

                        viewerPre.closest('.cait_settings-cont').classList.add('active');
                        // viewerPre.innerHTML = JSON.stringify(data.character, null, 2); // Alternative
                    }
                    else {
                        alert("Error while trying to show settings.")
                    }
                }
            })
            .catch(err => console.log(err));
    }

    // CHARACTER DOWNLOAD - END





    function CreateTavernChatBlob(chatData) {
        const userName = 'You';
        const characterName = chatData[0].src__name ?? chatData[0].src.name;
        const createDate = Date.now();
        const initialPart = JSON.stringify({
            user_name: userName,
            character_name: characterName,
            create_date: createDate,
        });
        const outputLines = [initialPart];

        chatData.filter(msg => msg.is_alternative === false).forEach((message) => {
            let currentUser = message.src__name != characterName && message.src.name != characterName
                ? "You"
                : characterName;
            const formattedMessage = JSON.stringify({
                name: currentUser,
                is_user: currentUser === "You",
                is_name: true,
                send_date: Date.now(),
                mes: message.text,
            });

            outputLines.push(formattedMessage);
        });

        const outputString = outputLines.join('\n');

        return new Blob([outputString], { type: 'application/jsonl' });
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

    function getCharId() {
        const url = new URL(window.location.href);
        const searchParams = new URLSearchParams(url.search);
        const charId = searchParams.get('char');
        return charId;
    }

    function getAccessToken() {
        return document.querySelector('meta[cai_token]').getAttribute('cai_token');
    }

    function parseHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content;
    }

    // Source: https://github.com/hughsk/png-chunks-extract
    var uint8 = new Uint8Array(4)
    var int32 = new Int32Array(uint8.buffer)
    var uint32 = new Uint32Array(uint8.buffer)
    function extractChunks(data) {
        if (data[0] !== 0x89) throw new Error('Invalid .png file header')
        if (data[1] !== 0x50) throw new Error('Invalid .png file header')
        if (data[2] !== 0x4E) throw new Error('Invalid .png file header')
        if (data[3] !== 0x47) throw new Error('Invalid .png file header')
        if (data[4] !== 0x0D) throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?')
        if (data[5] !== 0x0A) throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?')
        if (data[6] !== 0x1A) throw new Error('Invalid .png file header')
        if (data[7] !== 0x0A) throw new Error('Invalid .png file header: possibly caused by DOS-Unix line ending conversion?')

        var ended = false
        var chunks = []
        var idx = 8

        while (idx < data.length) {
            // Read the length of the current chunk,
            // which is stored as a Uint32.
            uint8[3] = data[idx++]
            uint8[2] = data[idx++]
            uint8[1] = data[idx++]
            uint8[0] = data[idx++]

            // Chunk includes name/type for CRC check (see below).
            var length = uint32[0] + 4
            var chunk = new Uint8Array(length)
            chunk[0] = data[idx++]
            chunk[1] = data[idx++]
            chunk[2] = data[idx++]
            chunk[3] = data[idx++]

            // Get the name in ASCII for identification.
            var name = (
                String.fromCharCode(chunk[0]) +
                String.fromCharCode(chunk[1]) +
                String.fromCharCode(chunk[2]) +
                String.fromCharCode(chunk[3])
            )

            // The IHDR header MUST come first.
            if (!chunks.length && name !== 'IHDR') {
                throw new Error('IHDR header missing')
            }

            // The IEND header marks the end of the file,
            // so on discovering it break out of the loop.
            if (name === 'IEND') {
                ended = true
                chunks.push({
                    name: name,
                    data: new Uint8Array(0)
                })

                break
            }

            // Read the contents of the chunk out of the main buffer.
            for (var i = 4; i < length; i++) {
                chunk[i] = data[idx++]
            }

            // Read out the CRC value for comparison.
            // It's stored as an Int32.
            uint8[3] = data[idx++]
            uint8[2] = data[idx++]
            uint8[1] = data[idx++]
            uint8[0] = data[idx++]

            var crcActual = int32[0]
            var crcExpect = CRC32.buf(chunk)
            if (crcExpect !== crcActual) {
                throw new Error(
                    'CRC values for ' + name + ' header do not match, PNG file is likely corrupted'
                )
            }

            // The chunk data is now copied to remove the 4 preceding
            // bytes used for the chunk name/type.
            var chunkData = new Uint8Array(chunk.buffer.slice(4))

            chunks.push({
                name: name,
                data: chunkData
            })
        }

        if (!ended) {
            throw new Error('.png file ended prematurely: no IEND header was found')
        }

        return chunks
    }

})();
