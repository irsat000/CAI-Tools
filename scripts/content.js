

(() => {
    // These values must be updated when required
    const extAPI = chrome; // chrome / browser
    const extVersion = "1.6.4";

    const metadata = {
        version: 1,
        created: Date.now(),
        modified: Date.now(),
        source: null,
        tool: {
            name: "CAI Tools",
            version: extVersion,
            url: "https://www.github.com/irsat000/CAI-Tools"
        }
    };


    const xhook_lib__url = extAPI.runtime.getURL("scripts/xhook.min.js");
    const xhookScript = document.createElement("script");
    xhookScript.crossOrigin = "anonymous";
    xhookScript.id = "xhook";
    xhookScript.onload = function () {
        initialize_options_DOM();
    };
    xhookScript.src = xhook_lib__url;
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(xhookScript, firstScript);


    extAPI.runtime.onMessage.addListener((obj, sender, response) => {
        const { name, args } = obj;
        if (name === "Create_Options_DOM") {
            initialize_options_DOM();
        }
        else if (name === "Reset_Modal") {
            //document.querySelector(`meta[cai_currentConverExtId]`)?.remove(); //causes problems when the page is fast
            handleProgressInfoMeta(`(Loading...)`);
            cleanDOM();
        }
    });



    // FETCH MESSAGES

    function handleProgressInfoMeta(text) {
        if (document.querySelector('meta[cait_progressInfo]')) {
            document.querySelector('meta[cait_progressInfo]')
                .setAttribute('cait_progressInfo', text);
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cait_progressInfo', text);
            document.head.appendChild(meta);
        }
    }

    function cleanDOM() {
        let container = document.querySelector('.apppage');
        container.querySelectorAll('[data-tool="cai_tools"]').forEach(element => {
            element.remove();
        });
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

    function applyConversationMeta(converExtId, turns) {
        if (document.querySelector(`meta[cai_converExtId="${converExtId}"]`)) {
            document.querySelector(`meta[cai_converExtId="${converExtId}"]`)
                .setAttribute('cai_conversation', JSON.stringify(turns));
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cai_converExtId', converExtId);
            meta.setAttribute('cai_conversation', JSON.stringify(turns));
            document.head.appendChild(meta);
        }
        handleProgressInfoMeta(`(Ready!)`);
        console.log("FINISHED");
    }

    const fetchMessages = async ({ AccessToken, nextPage, converExtId, chatData, fetchDataType }) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        let url = `https://${getMembership()}.character.ai/chat/history/msgs/user/?history_external_id=${converExtId}`;
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
                chatData.turns = [...chatData.turns, ...data.messages];

                if (data.has_more == false) {
                    if (fetchDataType === "conversation") {
                        applyConversationMeta(converExtId, chatData.turns);
                    }
                    else if (fetchDataType === "history") {
                        chatData.history.push(chatData.turns);
                        chatData.turns = [];
                    }

                    return;
                    // This was the last fetch for the chat
                }

                await fetchMessages({
                    AccessToken: AccessToken,
                    nextPage: nextPage,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            })
            .catch(async (err) => {
                console.log("Likely the intentional rate limitting error. Will continue after 10 seconds.");
                await new Promise(resolve => setTimeout(resolve, 10000));
                return await fetchMessages({
                    AccessToken: AccessToken,
                    nextPage: nextPage,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            });
    };

    const fetchMessagesChat2 = async ({ AccessToken, nextToken, converExtId, chatData, fetchDataType }) => {
        //Will be similar to fetchMessages. Next token will come from the previous fetch.
        //Last chat will give next token too.
        //New fetch will repond with null next_token and empty turns.
        await new Promise(resolve => setTimeout(resolve, 200));
        let url = `https://neo.character.ai/turns/${converExtId}/`;
        await fetch(url + (nextToken ? `?next_token=${nextToken}` : ""), {
            "method": "GET",
            "headers": {
                "authorization": AccessToken,
            }
        })
            .then((res) => res.json())
            .then(async (data) => {
                if (data.meta.next_token == null) {
                    if (fetchDataType === "conversation") {
                        applyConversationMeta(converExtId, chatData.turns);
                    }
                    else if (fetchDataType === "history") {
                        chatData.history.push(chatData.turns);
                        chatData.turns = [];
                    }

                    return;
                    // If next_token is null, stops function and prevents calling function more
                    // This was the last fetch for the chat
                }

                chatData.turns = [...chatData.turns, ...data.turns];

                await fetchMessagesChat2({
                    AccessToken: AccessToken,
                    nextToken: data.meta.next_token,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            })
            .catch(async (err) => {
                console.log("Likely the intentional rate limitting error. Will continue after 10 seconds.");
                await new Promise(resolve => setTimeout(resolve, 10000));
                return await fetchMessagesChat2({
                    AccessToken: AccessToken,
                    nextToken: nextToken,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            });
    }

    const fetchHistory = async (charId) => {
        const metaChar = document.querySelector('meta[cai_charid="' + charId + '"]');
        const AccessToken = getAccessToken();
        // Safety check
        if (metaChar == null || AccessToken == null) {
            return;
        }
        const chatList = {
            history1: JSON.parse(metaChar.getAttribute('cai_history1_chatlist')),
            history2: JSON.parse(metaChar.getAttribute('cai_history2_chatlist'))
        }
        if (!chatList.history1 && !chatList.history2) {
            alert("Failed to get history");
            return;
        }

        console.log(chatList);
        createFetchStartedMeta("true");
        const finalHistory = [];
        let fetchedChatNumber = 1;
        const historyLength = (chatList.history1?.length || 0) + (chatList.history2?.length || 0);

        // Fetch chat2 history
        if (chatList.history2) {
            const chatData = { history: [], turns: [] }
            for (const chatId of chatList.history2) {
                await fetchMessagesChat2({
                    AccessToken: AccessToken,
                    nextToken: null,
                    converExtId: chatId,
                    chatData: chatData,
                    fetchDataType: "history"
                });
                fetchedChatNumber++;
                handleProgressInfoMeta(`(Loading... Chat ${fetchedChatNumber}/${historyLength} completed)`);
            }

            for (const chat of chatData.history) {
                if (chat.length < 2) {
                    continue;
                }
                const newSimplifiedChat = [];
                chat.reverse().forEach((msg) => {
                    const newSimplifiedMessage = {
                        name: msg.author.name,
                        message: encodeURIComponent(msg.candidates[msg.candidates.length - 1].raw_content)
                    }
                    newSimplifiedChat.push(newSimplifiedMessage);
                });
                finalHistory.push(newSimplifiedChat);
            }
        }

        // Fetch chat1 history
        // Will be after chat2 because if there is chat2 then the character is primarily chat2 char
        if (chatList.history1) {
            const chatData = { history: [], turns: [] }
            for (const chatId of chatList.history1) {
                await fetchMessages({
                    AccessToken: AccessToken,
                    nextPage: 0,
                    converExtId: chatId,
                    chatData: chatData,
                    fetchDataType: "history"
                });
                fetchedChatNumber++;
                handleProgressInfoMeta(`(Loading... Chat ${fetchedChatNumber}/${historyLength} completed)`);
            }

            for (const chat of chatData.history) {
                if (chat.length < 2) {
                    continue;
                }
                const newSimplifiedChat = [];
                chat.reverse().filter(m => m.is_alternative == false && m.src__name != null).forEach((msg) => {
                    const newSimplifiedMessage = {
                        name: msg.src__name,
                        message: encodeURIComponent(msg.text)
                    }
                    newSimplifiedChat.push(newSimplifiedMessage);
                });
                finalHistory.push(newSimplifiedChat);
            }
        }

        try {
            if (document.querySelector('meta[cai_charid="' + charId + '"]')) {
                document.querySelector('meta[cai_charid="' + charId + '"]')
                    .setAttribute('cai_history', JSON.stringify(finalHistory));
            }
            else {
                const meta = document.createElement('meta');
                meta.setAttribute('cai_charid', charId);
                meta.setAttribute('cai_history', JSON.stringify(finalHistory));
                document.head.appendChild(meta);
            }
            handleProgressInfoMeta(`(Ready!)`);
            console.log("FINISHED");
        } catch (error) {
        }
    };

    const fetchConversation = async (converExtId, pageType) => {
        createFetchStartedMeta_Conversation("true", converExtId);
        const AccessToken = getAccessToken();
        const chatData = { history: [], turns: [] };
        let args = {
            AccessToken: AccessToken,
            converExtId: converExtId,
            chatData: chatData,
            fetchDataType: "conversation"
        };
        if (pageType === "chat") {
            args.nextPage = 0;
        }
        else if (pageType === "chat2") {
            args.nextToken = null;
        }
        await fetchMessages(args);
    }

    // FETCH END


    // CAI Tools - DOM

    function initialize_options_DOM() {
        if (window.location.href.includes("character.ai/histories")) {
            const intervalId = setInterval(() => {
                let container = document.querySelector('.apppage');
                if (container != null) {
                    clearInterval(intervalId);
                    create_options_DOM_History(container);
                }
            }, 1000);
        }
        else if (window.location.href.includes("character.ai/chat")) {
            const intervalId = setInterval(() => {
                let currentConverExtIdMeta = document.querySelector(`meta[cai_currentConverExtId]`);
                let container = document.querySelector('.apppage');
                if (container != null && currentConverExtIdMeta != null) {
                    clearInterval(intervalId);
                    if (window.location.href.includes("character.ai/chat2")) {
                        create_options_DOM_Conversation(container, "chat2");
                    }
                    else {
                        create_options_DOM_Conversation(container, "chat");
                    }
                }
            }, 1000);
        }
    }

    function create_options_DOM_Conversation(container, pageType) {
        //clean if already exists
        cleanDOM();

        //Create cai tools in dom
        const cai_tools_string = `
            <div class="cait_button-cont" data-tool="cai_tools">
                <div class="dragCaitBtn">&#9946;</div>
                <button class="cai_tools-btn">CAI Tools</button>
            </div>
            <div class="cai_tools-cont" data-tool="cai_tools">
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
            <div class="cait_settings-cont" data-tool="cai_tools">
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
        container.appendChild(parseHTML_caiTools(cai_tools_string));

        //open modal upon click on btn
        container.querySelector('.cai_tools-btn').addEventListener('mouseup', clickOnBtn);
        container.querySelector('.cai_tools-btn').addEventListener('touchstart', clickOnBtn);

        function clickOnBtn() {
            container.querySelector('.cai_tools-cont').classList.add('active');

            let currentConverExtId = getCurrentConverId();
            const checkExistingConver = document.querySelector(`meta[cai_converExtId="${currentConverExtId}"]`);

            const converStatusInterval = setInterval(() => {
                if (checkExistingConver != null && checkExistingConver.getAttribute('cai_conversation') != null) {
                    container.querySelector('.cai_tools-cont .cait_progressInfo').textContent = '(Ready!)';
                    clearInterval(converStatusInterval);
                    return;
                }
                const converStatus = document.querySelector(`meta[cait_progressInfo]`);
                if (converStatus != null) {
                    const converStatusText = converStatus.getAttribute('cait_progressInfo');
                    try {
                        container.querySelector('.cai_tools-cont .cait_progressInfo').textContent = converStatusText;
                    } catch (error) {
                        clearInterval(converStatusInterval);
                    }
                    if (converStatusText === '(Ready!)') {
                        clearInterval(converStatusInterval);
                    }
                }
            }, 1000);

            const fetchStarted = document.querySelector(`meta[cai_fetchStarted_conver][cai_fetchStatusExtId="${currentConverExtId}"]`)
                ?.getAttribute('cai_fetchStarted_conver');
            if ((checkExistingConver?.getAttribute('cai_conversation') == null) && fetchStarted !== "true") {
                fetchConversation(currentConverExtId, pageType);
            }
        }

        //close modal
        container.querySelector('.cai_tools-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cai_tools-cont') || target.classList.contains('cait-close')) {
                close_caiToolsModal(container);
            }
        });
        container.querySelector('.cait_settings-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_settings-cont') || target.classList.contains('caits-close')) {
                close_caitSettingsModal(container);
            }
        });

        container.querySelector('.cai_tools-cont [data-cait_type="character_hybrid"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_hybrid' };
            DownloadCharacter(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="character_card"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_card' };
            DownloadCharacter(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="character_settings"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_settings' };
            DownloadCharacter(args);
            close_caiToolsModal(container);
        });

        container.querySelector('.cai_tools-cont [data-cait_type="oobabooga"]').addEventListener('click', () => {
            const args = { downloadType: 'oobabooga', pageType: pageType };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="tavern"]').addEventListener('click', () => {
            const args = { downloadType: 'tavern', pageType: pageType };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'example_chat', pageType: pageType };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
    }

    function create_options_DOM_History(container) {
        const charId = getCharId();

        //clean if already exists
        cleanDOM();

        //Create cai tools in dom
        const cai_tools_string = `
            <div class="cait_button-cont" data-tool="cai_tools">
                <div class="dragCaitBtn">&#9946;</div>
                <button class="cai_tools-btn">CAI Tools</button>
            </div>
            <div class="cai_tools-cont" data-tool="cai_tools">
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
                            <li data-cait_type='cai_tavern_history'>Tavern Chats (zip/jsonl)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(parseHTML_caiTools(cai_tools_string));

        const historyMeta = document.querySelector(`meta[cai_charid="${charId}"][cai_history]`);

        //open modal upon click on btn
        container.querySelector('.cai_tools-btn').addEventListener('mouseup', clickOnBtn);
        container.querySelector('.cai_tools-btn').addEventListener('touchstart', clickOnBtn);
        function clickOnBtn() {
            container.querySelector('.cai_tools-cont').classList.add('active');

            const fetchStarted = document.querySelector(`meta[cai_fetchStarted][cai_fetchStatusCharId="${charId}"]`)
                ?.getAttribute('cai_fetchStarted');
            if ((historyMeta == null || historyMeta.getAttribute('cai_history') == null) && fetchStarted !== "true") {
                fetchedChatNumber = 1;
                fetchHistory(charId);
            }
        };

        //close modal
        container.querySelector('.cai_tools-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cai_tools-cont') || target.classList.contains('cait-close')) {
                close_caiToolsModal(container);
            }
        });

        const histStatusInterval = setInterval(() => {
            if (historyMeta != null && historyMeta.getAttribute('cai_history') != null) {
                container.querySelector('.cai_tools-cont .cait_progressInfo').textContent = '(Ready!)';
                clearInterval(histStatusInterval);
                return;
            }
            const histStatus = document.querySelector(`meta[cait_progressInfo]`);
            if (histStatus != null) {
                const histStatusText = histStatus.getAttribute('cait_progressInfo');
                try {
                    container.querySelector('.cai_tools-cont .cait_progressInfo').textContent = histStatusText;
                } catch (error) {
                    clearInterval(histStatusInterval);
                }
                if (histStatusText === '(Ready!)') {
                    clearInterval(histStatusInterval);
                }
            }
        }, 1000);


        container.querySelector('.cai_tools-cont [data-cait_type="cai_offline_read"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_offline_read' };
            DownloadHistory(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'example_chat' };
            DownloadHistory(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="cai_tavern_history"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_tavern_history' };
            DownloadHistory(args);
            close_caiToolsModal(container);
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
        const pageType = args.pageType;
        const chatData =
            JSON.parse(document.querySelector(`meta[cai_converExtId="${getCurrentConverId()}"]`)?.getAttribute('cai_conversation') || 'null');

        if (chatData == null) {
            alert("Data doesn't exist or not ready. Try again later.")
            return;
        }

        console.log(chatData);

        let charName = pageType === "chat"
            ? chatData[0].src__name
            : chatData[chatData.length - 1].author.name;

        switch (args.downloadType) {
            case "oobabooga":
                DownloadConversation_Oobabooga(chatData, args, charName);
                break;
            case "tavern":
                DownloadConversation_Tavern(chatData, args, charName);
                break;
            case "example_chat":
                DownloadConversation_ChatExample(chatData, args, charName);
                break;
            default:
                break;
        }
    }

    function DownloadConversation_Oobabooga(chatData, args, charName) {
        const ChatObject = {
            data: [],
            data_visible: [],
        };

        if (args.pageType === "chat") {
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
        }
        else if (args.pageType === "chat2") {
            const turns = chatData.reverse();
            turns.shift();
            turns.forEach((msg, index) => {
                if (index % 2 == 0) {
                    currentPair = [];
                    currentPair.push(msg.candidates[msg.candidates.length - 1].raw_content ?? "Message error");
                }
                else {
                    currentPair.push(msg.candidates[msg.candidates.length - 1].raw_content ?? "Message error");
                    ChatObject.data.push(currentPair);
                    ChatObject.data_visible.push(currentPair);
                }
            });
        }

        const Data_FinalForm = JSON.stringify(ChatObject);
        const blob = new Blob([Data_FinalForm], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_${args.downloadType}_Chat.json`;
        link.click();
    }

    function DownloadConversation_Tavern(chatData, args, charName) {
        if (chatData.length <= 1) {
            alert("The conversation is empty.")
            return;
        }
        const blob = CreateTavernChatBlob(chatData, args, charName);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_${args.downloadType}_Chat.jsonl`;
        link.click();
    }

    function DownloadConversation_ChatExample(chatData, args, charName) {
        const messageList = [];
        messageList.push("<START>");
        if (args.pageType === "chat") {
            chatData.filter(msg => msg.is_alternative === false)
                .forEach(msg => {
                    const user = msg.src__is_human ? "user" : "char";
                    const message = `{{${user}}}: ${msg.text}`;
                    messageList.push(message);
                });
        }
        else if (args.pageType === "chat2") {
            const turns = chatData.reverse();
            turns.forEach(msg => {
                const user = msg.author.is_human ? "user" : "char";
                const message = `{{${user}}}: ${msg.candidates[msg.candidates.length - 1].raw_content}`;
                messageList.push(message);
            });
        }
        const chatString = messageList.join("\n");

        const blob = new Blob([chatString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_Example.txt`;
        link.click();
    }

    function CreateTavernChatBlob(chatData, args, charName) {

        // NEXT STEP!!!


        const userName = 'You';
        const createDate = Date.now();
        const initialPart = JSON.stringify({
            user_name: userName,
            character_name: charName,
            create_date: createDate,
        });
        const outputLines = [initialPart];

        if (args.pageType === "chat") {
            chatData.filter(msg => msg.is_alternative === false).forEach((msg, index) => {
                let currentUser = index % 2 == 0
                    ? charName
                    : "You";
                const formattedMessage = JSON.stringify({
                    name: currentUser,
                    is_user: currentUser === "You",
                    is_name: true,
                    send_date: Date.now(),
                    mes: msg.text
                });

                outputLines.push(formattedMessage);
            });
        }
        else {
            const turns = chatData.reverse();
            turns.forEach((msg, index) => {
                let currentUser = index % 2 == 0
                    ? charName
                    : "You";
                const formattedMessage = JSON.stringify({
                    name: currentUser,
                    is_user: currentUser === "You",
                    is_name: true,
                    send_date: Date.now(),
                    mes: msg.candidates[msg.candidates.length - 1].raw_content ?? "Message error"
                });

                outputLines.push(formattedMessage);
            });
        }
        const outputString = outputLines.join('\n');

        return new Blob([outputString], { type: 'application/jsonl' });
    }



    // HISTORY

    function DownloadHistory(args) {
        const charId = getCharId();
        const historyData =
            JSON.parse(document.querySelector('meta[cai_charid="' + charId + '"]')?.getAttribute('cai_history') || 'null');

        if (historyData == null) {
            alert("Data doesn't exist or not ready. Try again later.")
            return;
        }

        const character_name = historyData[0][0].name;

        const dtype = args.downloadType;
        switch (dtype) {
            case "cai_offline_read":
                DownloadHistory_OfflineReading(historyData, character_name);
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

        // NO CHAT VERSION DISCRIMINATION. CHAT LIVES MATTER!
    }

    function DownloadHistory_OfflineReading(historyData, character_name) {
        let offlineHistory = [];

        let i = 1;
        historyData.forEach(chat => {
            offlineHistory.push({ id: i, messages: chat });
            i++;
        });

        var fileUrl = extAPI.runtime.getURL('ReadOffline.html');
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

    function DownloadHistory_ExampleChat(historyData, character_name) {
        const messageList = [];

        historyData.forEach(chat => {
            messageList.push("<START>");
            chat.forEach(msg => {
                const messager = msg.name == character_name ? "char" : "user";
                const message = `{{${messager}}}: ${decodeURIComponent(msg.message)}`;
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
        const char_id = getCharId();
        const zip = new JSZip();
        let count = 0;

        const filePromises = historyData.map(async (chat, index) => {
            count = index + 1;
            const blob = CreateTavernChatBlob(chat, character_name);
            const arraybuffer = await readAsBinaryString(blob);
            zip.file(`chat_${index + 1}.jsonl`, arraybuffer, { binary: true });
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
        const fetchUrl = "https://" + getMembership() + ".character.ai/chat/character/";
        const AccessToken = getAccessToken();
        const charId = getCharId();
        const payload = { external_id: charId }
        if (AccessToken != null && charId != null) {
            fetchCharacterInfo(fetchUrl, AccessToken, payload, args.downloadType);
        }
        else {
            alert("Couldn't find logged in user or character id.");
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
                    const newUrl = "https://" + getMembership() + ".character.ai/chat/character/info/";
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
                                if (prop === "categories" && data.character["categories"]) {
                                    const cates = data.character["categories"];
                                    let line = `<span class="cait_jv_prop">categories:</span> `;
                                    for (let i = 0; i < cates.length; i++) {
                                        line += cates[i].description + " - ";
                                    }
                                    line += "\r\n";
                                    viewerPre.innerHTML += line.replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
                                }
                                else {
                                    const line = `<span class="cait_jv_prop">${prop}:</span> ${data.character[prop]}\r\n`;
                                    viewerPre.innerHTML += line.replace(/\r/g, '&#13;').replace(/\n/g, '&#10;');
                                }
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

    // Might be unnecessary when I have getMembership()
    function checkPlus() {
        return window.location.hostname.indexOf("plus") > -1 ? true : false;
    }

    function getMembership() {
        return window.location.hostname.indexOf("plus") > -1 ? "plus" : "beta";
    }

    function getAccessToken() {
        return document.querySelector('meta[cai_token]').getAttribute('cai_token');
    }

    function getCurrentConverId() {
        return document.querySelector(`meta[cai_charid="${getCharId()}"][cai_currentConverExtId]`)?.getAttribute('cai_currentConverExtId');
    }

    function parseHTML_caiTools(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        var content = template.content;

        //Allows user to drag the button.
        makeDraggable(content.querySelector('.cait_button-cont'));

        //Three taps on dragger will remove the cai tools button.
        const handleTapToDisable = (() => {
            let tapCount = 0;
            let tapTimer;

            function resetTapCount() {
                tapCount = 0;
            }

            return function () {
                tapCount++;
                if (tapCount === 1) {
                    tapTimer = setTimeout(resetTapCount, 700); // Adjust the time window for detecting fast taps (in milliseconds)
                } else if (tapCount === 3) {
                    // Three taps occurred quickly
                    cleanDOM();
                    clearTimeout(tapTimer); // Clear the timer if three taps are reached
                }
            };
        })();
        content.querySelector(".dragCaitBtn").addEventListener("mouseup", handleTapToDisable);
        content.querySelector(".dragCaitBtn").addEventListener("touchstart", handleTapToDisable);

        return content;
    }

    function makeDraggable(elmnt) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.querySelector(".dragCaitBtn")) {
            // if present, the header is where you move the DIV from:
            document.querySelector(".dragCaitBtn").addEventListener("mousedown", dragMouseDown);
            document.querySelector(".dragCaitBtn").addEventListener("touchstart", dragMouseDown);
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.addEventListener("mousedown", dragMouseDown);
            elmnt.addEventListener("touchstart", dragMouseDown);
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.type === "touchstart" ? e.touches[0].clientX : e.clientX;
            pos4 = e.type === "touchstart" ? e.touches[0].clientY : e.clientY;
            document.addEventListener("mouseup", closeDragElement);
            document.addEventListener("touchend", closeDragElement);
            // call a function whenever the touch/mouse cursor moves:
            document.addEventListener("mousemove", elementDrag);
            document.addEventListener("touchmove", elementDrag);
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - (e.type === "touchmove" ? e.touches[0].clientX : e.clientX);
            pos2 = pos4 - (e.type === "touchmove" ? e.touches[0].clientY : e.clientY);
            pos3 = e.type === "touchmove" ? e.touches[0].clientX : e.clientX;
            pos4 = e.type === "touchmove" ? e.touches[0].clientY : e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.removeEventListener("mouseup", closeDragElement);
            document.removeEventListener("touchend", closeDragElement);
            document.removeEventListener("mousemove", elementDrag);
            document.removeEventListener("touchmove", elementDrag);
        }
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
