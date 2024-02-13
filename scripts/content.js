

(() => {
    // These values must be updated when required
    const extAPI = chrome; // chrome / browser
    const extVersion = "1.9.0";

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

    // AJAX hook
    const xhook_lib__url = extAPI.runtime.getURL("scripts/xhook.min.js");
    const xhookScript = document.createElement("script");
    xhookScript.crossOrigin = "anonymous";
    xhookScript.id = "xhook";
    xhookScript.onload = function () {
        initialize_options_DOM(window.location.pathname);
    };
    xhookScript.src = xhook_lib__url;
    // Web socket hook
    const wsHook_lib__url = extAPI.runtime.getURL("scripts/wsHook.js");
    const wsHookScript = document.createElement("script");
    wsHookScript.crossOrigin = "anonymous";
    wsHookScript.id = "wsHook";
    wsHookScript.onload = function () {
    };
    wsHookScript.src = wsHook_lib__url;
    // Insert hooks
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(xhookScript, firstScript);
    firstScript.parentNode.insertBefore(wsHookScript, firstScript);


    // A function to handle mutations
    function handleLocationChange(mutationsList, observer) {
        // Check if the URL has changed
        if (window.location.href !== observer.lastHref) {
            observer.lastHref = window.location.href;

            // Perform actions based on the URL change
            const path = window.location.pathname;
            if (path === "/chat" || path === "/chat2" || path === "/histories") {
                initialize_options_DOM(path);
            }
            else {
                // Handle the modal reset
                handleProgressInfoMeta("(Loading...)");
                cleanDOM();
            }
        }
    }
    // Create a MutationObserver instance
    const locationObserver = new MutationObserver(handleLocationChange);
    // Initialize the lastHref property
    locationObserver.lastHref = window.location.href;
    // Observe changes to the window.location.href
    locationObserver.observe(document, {
        childList: true,
        attributes: false,
        subtree: true,
        characterData: false
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
        if (!container) return;
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

    function applyConversationMeta(converExtId, newSimplifiedChat) {
        if (document.querySelector(`meta[cai_converExtId="${converExtId}"]`)) {
            document.querySelector(`meta[cai_converExtId="${converExtId}"]`)
                .setAttribute('cai_conversation', JSON.stringify(newSimplifiedChat));
        }
        else {
            const meta = document.createElement('meta');
            meta.setAttribute('cai_converExtId', converExtId);
            meta.setAttribute('cai_conversation', JSON.stringify(newSimplifiedChat));
            document.head.appendChild(meta);
        }
        handleProgressInfoMeta(`(Ready!)`);
        console.log("FINISHED", newSimplifiedChat);
    }

    const fetchMessages = async ({ AccessToken, nextPage, converExtId, chatData, fetchDataType }) => {
        console.log(nextPage);
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

                chatData.turns = [...data.messages, ...chatData.turns];

                if (data.has_more == false) {
                    const newSimplifiedChat = [];
                    chatData.turns.filter(m => m.is_alternative == false && m.src__name != null).forEach((msg) => {
                        const newSimplifiedMessage = {
                            name: msg.src__name,
                            message: msg.text,
                            isHuman: msg.src__is_human
                        }
                        newSimplifiedChat.push(newSimplifiedMessage);
                    });

                    if (fetchDataType === "conversation") {
                        applyConversationMeta(converExtId, newSimplifiedChat);
                    }
                    else if (fetchDataType === "history") {
                        chatData.history.push(newSimplifiedChat);
                        chatData.turns = [];
                    }

                    return;
                    // This was the last fetch for the chat
                }

                await fetchMessages({
                    AccessToken: AccessToken,
                    nextPage: data.next_page,
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
                    const newSimplifiedChat = [];
                    chatData.turns.forEach((msg) => {
                        const newSimplifiedMessage = {
                            name: msg.author.name,
                            message: msg.candidates[msg.candidates.length - 1].raw_content,
                            isHuman: !!msg.author.is_human
                        }
                        newSimplifiedChat.push(newSimplifiedMessage);
                    });

                    newSimplifiedChat.reverse();

                    if (fetchDataType === "conversation") {
                        applyConversationMeta(converExtId, newSimplifiedChat);
                    }
                    else if (fetchDataType === "history") {
                        chatData.history.push(newSimplifiedChat);
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

        createFetchStartedMeta("true");
        let finalHistory = [];
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

            finalHistory = [...finalHistory, ...chatData.history];
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

            finalHistory = [...finalHistory, ...chatData.history];
        }

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
        console.log("FINISHED", finalHistory);
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
        if (pageType === "/chat") {
            args.nextPage = 0;
            await fetchMessages(args);
        }
        else if (pageType === "/chat2") {
            args.nextToken = null;
            await fetchMessagesChat2(args);
        }
    }

    // FETCH END


    // CAI Tools - DOM

    function initialize_options_DOM(path) {
        if (path === '/histories') {
            const intervalId = setInterval(() => {
                let container = document.querySelector('.apppage');
                if (container != null) {
                    clearInterval(intervalId);
                    create_options_DOM_History(container);
                }
            }, 1000);
        }
        else if ((path === '/chat' || path === '/chat2') && getCharId()) {
            const intervalId = setInterval(() => {
                let currentConverExtIdMeta = document.querySelector(`meta[cai_currentConverExtId]`);
                let container = document.querySelector('.apppage');
                if (container != null && currentConverExtIdMeta != null) {
                    clearInterval(intervalId);
                    create_options_DOM_Conversation(container, path);
                    // Memory reveal on click and prevent redirect
                    container.addEventListener('click', (e) => {
                        const el = e.target;
                        if (el.matches('a[href="#-"], a[title]') && el.textContent === "-") {
                            e.preventDefault();
                            el.textContent = el.getAttribute('title');
                            el.dataset.revealed_memory = true;
                        } else if (el.dataset.revealed_memory) {
                            e.preventDefault();
                        }
                    });
                }
            }, 1000);
        }
        // Else, the user is not in relevant pages.
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
                    <a href="https://www.patreon.com/Irsat" target="_blank" class="donate_link">Support me on Patreon</a>
                    <div class="cait-body">
                        <span class="cait_warning"></span>
                        <h6>Character</h6>
                        <ul>
                            <li data-cait_type='memory_manager'>Memory Manager</li>
                            <li data-cait_type='character_hybrid'>Character (json)</li>
                            <li data-cait_type='character_card'>Character Card (png)</li>
                            <li data-cait_type='character_settings'>Show settings</li>
                        </ul>
                        <h6>This conversation</h6>
                        <span class='cait_progressInfo'>(Loading...)</span>
                        <ul>
                            <li data-cait_type='cai_duplicate_chat'>Create Duplicate <i>(Last 100 msgs)</i></li>
                            <li data-cait_type='cai_duplicate_chat_full'>Create Duplicate <i>(Full)</i></li>
                            <li data-cait_type='cai_offline_read'>Offline Chat</li>
                            <li data-cait_type='example_chat'>Chat as Definition</li>
                            <li data-cait_type='oobabooga'>Oobabooga chat</li>
							<li data-cait_type='tavern'>Tavern chat</li>
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
            <div class="cait_memory_manager-cont" data-tool="cai_tools" data-import_needed="true">
                <div class="cait_memory_manager">
                    <div class="caitmm_header">
                        <h4>Memory Manager</h4><span class="caitmm-close">x</span>
                    </div>
                    <div class="caitmm-body">
                        <label class="mm_status">Active <input type="checkbox" name="cait_mm_active" unchecked /></label>
                        <span class="note">Note: 0 frequency means every message.</span>
                        <span class="reminder-wrap">
                            Remind every <input type="number" name="remind_frequency" value="5" min="0" max="100" /> messages
                        </span>
                        <textarea class="mm_new_memory" name="new_memory" placeholder="New memory (Line breaks are not recommended but will work)"></textarea>
                        <button type="button" class="add_new_memory">Add New</button>
                        <ul class="mm-current_memory_list">
                        </ul>
                        <div class="mm-action-cont">
                            <button type="button" class="cancel">Cancel</button>
                            <button type="button" class="save">Save</button>
                        </div>
                    </div>
                </div>
            </div>
            <div class="cait_info-cont">
                <div class="cait_info">
                    <div class="caiti_header">
                        <h4>CAI Tools</h4><span class="caiti-close">x</span>
                    </div>
                    <div class="caiti-body">
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
        container.querySelector('.cait_memory_manager-cont').addEventListener('mousedown', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_memory_manager-cont') || target.classList.contains('caitmm-close')) {
                setTimeout(() => {
                    close_caitMemoryManagerModal(container);
                    // To prevent further click by accident, mousedown immediately runs, not when mouse is lifted
                }, 200);
            }

            /* Alternative to accidents
            container.querySelector('.caitmm-close').addEventListener('click', () => {
                close_caitMemoryManagerModal(container);
            });*/
        });
        container.querySelector('.cait_info-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_info-cont') || target.classList.contains('caiti-close')) {
                close_caitInfoModal();
            }
        });

        // Features on click
        container.querySelector('.cai_tools-cont [data-cait_type="memory_manager"]').addEventListener('click', () => {
            MemoryManager();
            close_caiToolsModal(container);
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

        container.querySelector('.cai_tools-cont [data-cait_type="cai_offline_read"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_offline_read' };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="cai_duplicate_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_duplicate_chat' };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="cai_duplicate_chat_full"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_duplicate_chat_full' };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="oobabooga"]').addEventListener('click', () => {
            const args = { downloadType: 'oobabooga' };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="tavern"]').addEventListener('click', () => {
            const args = { downloadType: 'tavern' };
            DownloadConversation(args);
            close_caiToolsModal(container);
        });
        container.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'example_chat' };
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
                    <a href="https://www.patreon.com/Irsat" target="_blank" class="donate_link">Support me on Patreon</a>
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

    // I don't know why I am using "container." instead of "document."
    function close_caiToolsModal(container) {
        container.querySelector('.cai_tools-cont').classList.remove('active');
    }
    function close_caitSettingsModal(container) {
        container.querySelector('.cait_settings-cont').classList.remove('active');
    }
    function close_caitMemoryManagerModal(container) {
        if (container)
            container.querySelector('.cait_memory_manager-cont').classList.remove('active');
        else
            document.querySelector('.cait_memory_manager-cont').classList.remove('active');
    }
    function close_caitInfoModal() {
        document.querySelector('.cait_info-cont').classList.remove('active');
    }
    // CAI Tools - DOM - END



    // MEMORY MANAGER
    function MemoryManager() {
        try {
            const container = document.querySelector('.cait_memory_manager-cont');
            // Memory manager settings
            const mmActive = container.querySelector('input[name="cait_mm_active"]');
            const remindFrequency = container.querySelector('input[name="remind_frequency"]');
            // Memory managing
            const newMemoryField = container.querySelector('.mm_new_memory');
            const addNewMemoryBtn = container.querySelector('.add_new_memory');
            const currentMemoryList = container.querySelector('.mm-current_memory_list');
            // Save / Cancel
            const cancelPlan = container.querySelector('.cancel');
            const savePlan = container.querySelector('.save');
            // Push to memory list
            const pushToMemoryList = (memory) => {
                const li = document.createElement('li');
                const textarea = document.createElement('textarea');
                textarea.classList.add('memory');
                textarea.value = memory;
                const deleteBtn = document.createElement('button');
                deleteBtn.type = "button";
                deleteBtn.classList.add('delete_memory');
                deleteBtn.textContent = "Delete";
                deleteBtn.addEventListener('click', () => li.remove())
                li.appendChild(textarea);
                li.appendChild(deleteBtn);
                currentMemoryList.appendChild(li);
            }

            // Get settings from storage
            const defaultSettings = {
                mmActive: false,
                mmRemindFrequency: 5,
                mmList: [
                    /* Example
                    {
                        char: "ZYoXQIapG7SNgYRl6lKFbFhsU9IF5hWNBgP2DtT7GKk",
                        timesSkipped: 0,
                        list: [
                            "ZYoXQIapG7SNgYRl6lKFbFhsU9IF5hWNBgP2DtT7GKk Hello, this is the id of this characters. Be careful."
                        ]
                    }*/
                ]
            }

            // Initialize settings
            let caiToolsSettings = JSON.parse(localStorage.getItem('cai_tools'));
            if (!caiToolsSettings) {
                caiToolsSettings = {
                    memoryManager: defaultSettings
                }
            }
            else if (!caiToolsSettings.memoryManager) {
                caiToolsSettings.memoryManager = defaultSettings;
            }
            const settings = caiToolsSettings.memoryManager;

            // Import settings
            if (container.dataset.import_needed === "true") {
                mmActive.checked = settings.mmActive;
                remindFrequency.value = settings.mmRemindFrequency >= 0 ? settings.mmRemindFrequency : 5;
                // Import existing memory list and some error handling
                if (!settings.mmList) settings.mmList = [];
                const charId = getCharId();
                if (!charId) throw "Char ID is undefined";
                const charSettings = settings.mmList.find(obj => obj.char === charId);
                if (charSettings) {
                    // Clean up and append
                    currentMemoryList.innerHTML = "";
                    charSettings.list.forEach(pushToMemoryList);
                } else {
                    settings.mmList.push({
                        char: charId,
                        timesSkipped: 0,
                        list: []
                    });
                }
                // Prevent import the second time
                container.dataset.import_needed = "false";
            }

            // Add new memory
            addNewMemoryBtn.addEventListener('click', () => {
                if (newMemoryField.value.trim().length === 0) return;
                pushToMemoryList(newMemoryField.value.trim());
                newMemoryField.value = "";
            });

            // Cancel
            cancelPlan.addEventListener('click', () => {
                // Import from settings the next time
                container.dataset.import_needed = "true";
                close_caitMemoryManagerModal();
            });

            // Save
            savePlan.addEventListener('click', () => {
                try {
                    // Save the options
                    settings.mmActive = mmActive.checked;
                    settings.mmRemindFrequency = +remindFrequency.value >= 0 && +remindFrequency.value < 100 ? +remindFrequency.value : 5;
                    // Choose the specific character from the settings
                    const charId = getCharId();
                    if (!charId) throw "Char ID is undefined";
                    const charSettings = settings.mmList.find(obj => obj.char === charId);
                    // Clean up the memory list
                    charSettings.list = [];
                    // Save memories from the inputs
                    [...currentMemoryList.children].forEach(li => {
                        const memory = li.querySelector('textarea').value.trim();
                        if (memory.length > 0) {
                            const charSettings = settings.mmList.find(obj => obj.char === charId);
                            charSettings.list.push(memory);
                        }
                    });
                    // Save to local storage for persistent data
                    localStorage.setItem('cai_tools', JSON.stringify(caiToolsSettings));
                    // Close the modal
                    close_caitMemoryManagerModal();
                } catch (error) {
                    console.log("Screenshot this error please; ", error);
                    alert("Couldn't be saved, please report on github if you don't know the reason");
                }
            });

            // Open modal
            container.classList.add('active');
        } catch (error) {
            console.log("Screenshot this error please; ", error);
            alert("Memory manager couldn't be opened. Please create an issue in Github with the error in the console. F12 > Console tab")
        }
    }
    // MEMORY MANAGER - END



    // CONVERSATION
    function DownloadConversation(args) {
        const chatData =
            JSON.parse(document.querySelector(`meta[cai_converExtId="${getCurrentConverId()}"]`)?.getAttribute('cai_conversation') || 'null');

        if (chatData == null) {
            alert("Data doesn't exist or not ready. Try again later.")
            return;
        }

        const charName = chatData[0]?.name ?? "NULL!";

        switch (args.downloadType) {
            case "cai_offline_read":
                Download_OfflineReading(chatData);
                break;
            case "cai_duplicate_chat":
                DuplicateChat(chatData, 100);
                break;
            case "cai_duplicate_chat_full":
                DuplicateChat(chatData);
                break;
            case "oobabooga":
                if (charName === "NULL!") {
                    alert("Character name couldn't be found!");
                    return;
                }
                DownloadConversation_Oobabooga(chatData, charName);
                break;
            case "tavern":
                if (charName === "NULL!") {
                    alert("Character name couldn't be found!");
                    return;
                }
                DownloadConversation_Tavern(chatData, charName);
                break;
            case "example_chat":
                if (charName === "NULL!") {
                    alert("Character name couldn't be found!");
                    return;
                }
                DownloadConversation_ChatExample(chatData, charName);
                break;
            default:
                break;
        }
    }



    async function DuplicateChat(chatData, maxMsgLength) {
        try {
            // Trim the chatData for faster job, optionally
            if (maxMsgLength) {
                // Get last X messages
                chatData = chatData.slice(-maxMsgLength);
            }

            // Get all necessary data
            console.log("Cloning:", chatData);
            const charId = getCharId();
            const userInfo = await getUserId({ withUsername: true });
            if (!userInfo || !charId) {
                alert("Requirements missing, can't proceed to duplication.");
                return;
            }
            const { userId, username } = userInfo;


            // Deactivate memory manager before duplication
            // because it will intercept the duplicated messages and add the memories
            let caiToolsSettings = JSON.parse(localStorage.getItem('cai_tools'));
            if (caiToolsSettings && caiToolsSettings.memoryManager) {
                caiToolsSettings.memoryManager.mmActive = false;
                localStorage.setItem('cai_tools', JSON.stringify(caiToolsSettings))
            }
            // Initialize link here
            let newChatPage = null;
            // Create new connection
            const socket = new WebSocket("wss://neo.character.ai/ws/");
            let msgIndex = 0;
            // For back to back messages, we need the last message info
            let prevThisTurnId = "";
            // For persisting origin id, for whatever it is
            const randomOriginId = crypto.randomUUID();
            // Store chat id
            let chatId = "";
            let abortedReqs = [];

            // Start informing user
            const infoContainer = document.querySelector('.cait_info-cont');
            const infoBody = infoContainer.querySelector('.caiti-body');
            infoBody.innerHTML = "Creating new chat...";
            infoContainer.classList.add('active');

            // Handle incoming messages
            socket.addEventListener("message", (event) => {
                if (!event.data) return;
                const wsdata = JSON.parse(event.data);
                // console.log(wsdata);

                // We need to wait after create_chat_response and get the greeting message
                // From that message, we will get the ids that we will use to send message
                // turn.primary_candidate_id to get update_primary_candidate.candidate_id
                // turn.turn_key.turn_id to get update_primary_candidate.candidate_id.turn_id
                if (wsdata.command === "create_chat_response") {
                    if (!wsdata.chat || !wsdata.chat.character_id || !wsdata.chat.chat_id) {
                        alert("New chat requirements missing, can't proceed to duplication.");
                        return;
                    }
                    chatId = wsdata.chat.chat_id;
                    // Store to give user later
                    newChatPage = `https://${getMembership()}.character.ai/chat2?char=${charId}&hist=${chatId}`;
                    console.log(newChatPage);
                }
                else if (wsdata.command === "remove_turns_response") {
                    // Remove means previous message was the user as well, so we have to delete it and send message
                    // Get necessary data
                    const msg = chatData[msgIndex];
                    const thisTurnId = crypto.randomUUID();

                    // Increase the index to get next msg in line
                    msgIndex++;

                    // Update info
                    infoBody.innerHTML = `<p>Recreating messages from scratch ${msgIndex}/${chatData.length}</p>`;

                    const sendUserMessageAgainPayload = {
                        "command": "create_and_generate_turn",
                        "request_id": crypto.randomUUID(),
                        "payload": {
                            "num_candidates": 1,
                            "tts_enabled": false,
                            "selected_language": "English",
                            "character_id": charId,
                            "user_name": username,
                            "turn": {
                                "turn_key": {
                                    "turn_id": thisTurnId,
                                    "chat_id": chatId
                                },
                                "author": {
                                    "author_id": userId.toString(),
                                    "is_human": true,
                                    "name": username
                                },
                                "candidates": [{
                                    "candidate_id": thisTurnId,
                                    "raw_content": msg.message
                                }],
                                "primary_candidate_id": thisTurnId
                            },
                            "previous_annotations": {
                                "boring": 0,
                                "not_boring": 0,
                                "inaccurate": 0,
                                "not_inaccurate": 0,
                                "repetitive": 0,
                                "not_repetitive": 0,
                                "out_of_character": 0,
                                "not_out_of_character": 0,
                                "bad_memory": 0,
                                "not_bad_memory": 0,
                                "long": 0,
                                "not_long": 0,
                                "short": 0,
                                "not_short": 0,
                                "ends_chat_early": 0,
                                "not_ends_chat_early": 0,
                                "funny": 0,
                                "not_funny": 0,
                                "interesting": 0,
                                "not_interesting": 0,
                                "helpful": 0,
                                "not_helpful": 0
                            },
                            "update_primary_candidate": {
                                "candidate_id": prevThisTurnId,
                                "turn_key": {
                                    "turn_id": prevThisTurnId,
                                    "chat_id": chatId
                                }
                            }
                        },
                        "origin_id": randomOriginId
                    };
                    socket.send(JSON.stringify(sendUserMessageAgainPayload));
                }
                else if (wsdata.command === "add_turn" || wsdata.command === "update_turn") {
                    // Aborting sometimes deletes unexpectedly, I will skip aborting for now
                    // Abort once if it's CHAR's "update" to get response as fast as we can
                    // Note: aborting add_turn results in complete message delete and thus duplication failure
                    if (false && !wsdata.turn.candidates[0].is_final
                        && !wsdata.turn.author.is_human
                        && !abortedReqs.includes(wsdata.request_id)
                        && wsdata.command === "update_turn") {
                        // Use request_id of the update_turn
                        const abortPayload = {
                            "command": "abort_generation",
                            "request_id": wsdata.request_id,
                            "origin_id": randomOriginId
                        };
                        socket.send(JSON.stringify(abortPayload));
                        // Add to aborted request to not abort again
                        abortedReqs.push(wsdata.request_id);
                        return;
                    }
                    else if (!wsdata.turn.candidates[0].is_final) return; // Ignore updates and take final one
                    else if (wsdata.turn.author.is_human) return; // Ignore the user's message
                    else if (msgIndex >= chatData.length) {
                        // Stop if the original chat came to an end
                        // And update the info modal with link
                        infoBody.innerHTML = `<p>Complete! Duplicate chat;<br /><a href="${newChatPage}" target="_blank">${newChatPage}</a></p>`;
                        return
                    };

                    // Get necessary data
                    const msg = chatData[msgIndex];
                    const prevMsgWasHuman = chatData[msgIndex - 1] ? chatData[msgIndex - 1].isHuman : false;

                    const thisTurnId = crypto.randomUUID();
                    prevThisTurnId = thisTurnId;
                    // These are required to follow up the previous message
                    const turnKey = wsdata.turn.turn_key.turn_id;
                    const candidateId = wsdata.turn.primary_candidate_id;
                    // Increase the index to get next msg in line
                    msgIndex++;

                    // Update info
                    if (!infoContainer.classList.contains('active')) {
                        infoContainer.classList.add('active');
                    }
                    infoBody.innerHTML = `<p>Recreating messages from scratch ${msgIndex}/${chatData.length}</p>`;

                    // If msg is human and previous wasn't human, send message
                    if (msg.isHuman && !prevMsgWasHuman) {
                        const sendUserMessagePayload = {
                            "command": "create_and_generate_turn",
                            "request_id": crypto.randomUUID(),
                            "payload": {
                                "num_candidates": 1,
                                "tts_enabled": false,
                                "selected_language": "English",
                                "character_id": charId,
                                "user_name": username,
                                "turn": {
                                    "turn_key": {
                                        "turn_id": thisTurnId,
                                        "chat_id": chatId
                                    },
                                    "author": {
                                        "author_id": userId.toString(),
                                        "is_human": true,
                                        "name": username
                                    },
                                    "candidates": [{
                                        "candidate_id": thisTurnId,
                                        "raw_content": msg.message
                                    }],
                                    "primary_candidate_id": thisTurnId
                                },
                                "previous_annotations": {
                                    "boring": 0,
                                    "not_boring": 0,
                                    "inaccurate": 0,
                                    "not_inaccurate": 0,
                                    "repetitive": 0,
                                    "not_repetitive": 0,
                                    "out_of_character": 0,
                                    "not_out_of_character": 0,
                                    "bad_memory": 0,
                                    "not_bad_memory": 0,
                                    "long": 0,
                                    "not_long": 0,
                                    "short": 0,
                                    "not_short": 0,
                                    "ends_chat_early": 0,
                                    "not_ends_chat_early": 0,
                                    "funny": 0,
                                    "not_funny": 0,
                                    "interesting": 0,
                                    "not_interesting": 0,
                                    "helpful": 0,
                                    "not_helpful": 0
                                },
                                "update_primary_candidate": {
                                    "candidate_id": candidateId,
                                    "turn_key": {
                                        "turn_id": turnKey,
                                        "chat_id": chatId
                                    }
                                }
                            },
                            "origin_id": randomOriginId
                        };
                        socket.send(JSON.stringify(sendUserMessagePayload));
                    }
                    else if (msg.isHuman && prevMsgWasHuman) {
                        // If msg is human and previous was human, delete this char reply and send message
                        const deleteCharMessagePayload = {
                            "command": "remove_turns",
                            "request_id": "0325a206-d21c-4c61-95ce-57E-r595wbE0",
                            "payload": {
                                "chat_id": wsdata.turn.turn_key.chat_id,
                                "turn_ids": [turnKey]
                            },
                            "origin_id": randomOriginId
                        };
                        socket.send(JSON.stringify(deleteCharMessagePayload));
                    }
                    else {
                        // If msg is char, edit the reply received just now
                        const editCharMessagePayload = {
                            "command": "edit_turn_candidate",
                            "request_id": crypto.randomUUID(),
                            "payload": {
                                "turn_key": {
                                    "chat_id": wsdata.turn.turn_key.chat_id,
                                    "turn_id": turnKey
                                },
                                "current_candidate_id": wsdata.turn.candidates[0].candidate_id,
                                "new_candidate_raw_content": msg.message
                            },
                            "origin_id": randomOriginId
                        };
                        socket.send(JSON.stringify(editCharMessagePayload));
                    }
                }
                else {
                    console.log("WS Data:", wsdata);
                }
            });

            socket.addEventListener("open", () => {
                // Create new chat2
                const createChatPayload = {
                    "command": "create_chat",
                    "request_id": crypto.randomUUID(),
                    "payload": {
                        "chat": {
                            "chat_id": crypto.randomUUID(),
                            "creator_id": userId.toString(),
                            "visibility": "VISIBILITY_PRIVATE",
                            "character_id": charId,
                            "type": "TYPE_ONE_ON_ONE"
                        },
                        "with_greeting": true
                    },
                    "origin_id": randomOriginId
                }
                socket.send(JSON.stringify(createChatPayload));
            });
        } catch (error) {
            console.log(error);
        }
    }





    function DownloadConversation_Oobabooga(chatData, charName) {
        const ChatObject = {
            internal: [],
            visible: [],
            data: [],
            data_visible: [],
        };

        let currentPair = [];
        let prevName = null;

        // User's message first
        chatData.shift();

        chatData.forEach((msg) => {
            // If the current messager is the same as the previous one, merge and skip this iteration
            if (msg.name === prevName) {
                const dataLength = ChatObject.internal.length - 1;
                const pairLength = ChatObject.internal[dataLength].length - 1;

                let mergedMessage = ChatObject.internal[dataLength][pairLength] += "\n\n" + msg.message;
                ChatObject.internal[dataLength][pairLength] = mergedMessage;
                ChatObject.visible[dataLength][pairLength] = mergedMessage;
                ChatObject.data[dataLength][pairLength] = mergedMessage;
                ChatObject.data_visible[dataLength][pairLength] = mergedMessage;
                return;
            }

            // If the current messager is different, push to currentPair
            currentPair.push(msg.message);

            // If currentPair has 2 messages, push to ChatObject and reset
            if (currentPair.length === 2) {
                ChatObject.internal.push(currentPair);
                ChatObject.visible.push(currentPair);
                ChatObject.data.push(currentPair);
                ChatObject.data_visible.push(currentPair);
                currentPair = [];
            }

            // Update the previous messager's name
            prevName = msg.name;
        });

        const Data_FinalForm = JSON.stringify(ChatObject);
        const blob = new Blob([Data_FinalForm], { type: 'text/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_oobabooga_Chat.json`;
        link.click();
    }

    function DownloadConversation_Tavern(chatData, charName) {
        const blob = CreateTavernChatBlob(chatData, charName);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_tavern_Chat.jsonl`;
        link.click();
    }

    function DownloadConversation_ChatExample(chatData, charName) {
        const messageList = [];

        messageList.push("<START>");
        chatData.forEach(msg => {
            const messager = msg.name == charName ? "char" : "user";
            const message = `{{${messager}}}: ${msg.message}`;
            messageList.push(message);
        });

        const definitionString = messageList.join("\n");

        const blob = new Blob([definitionString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${charName}_Example.txt`;
        link.click();
    }

    function CreateTavernChatBlob(chatData, charName) {
        const userName = 'You';
        const createDate = Date.now();
        const initialPart = JSON.stringify({
            user_name: userName,
            character_name: charName,
            create_date: createDate,
        });
        const outputLines = [initialPart];

        let prevName = null;
        chatData.forEach((msg) => {
            // If the current messager is the same as the previous one, merge and skip this iteration
            if (msg.name === prevName) {
                let mergedMessage = JSON.parse(outputLines[outputLines.length - 1]);
                mergedMessage.mes += "\n\n" + msg.message;
                outputLines[outputLines.length - 1] = JSON.stringify(mergedMessage);
                return;
            }

            const formattedMessage = JSON.stringify({
                name: msg.name !== charName ? "You" : charName,
                is_user: msg.name !== charName,
                is_name: true,
                send_date: Date.now(),
                mes: msg.message
            });

            outputLines.push(formattedMessage);

            // Update the previous messager's name
            prevName = msg.name;
        });

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

        const charName = historyData[0]?.[0]?.name ?? "NULL!";

        const dtype = args.downloadType;
        switch (dtype) {
            case "cai_offline_read":
                Download_OfflineReading(historyData);
                break;
            case "example_chat":
                if (charName === "NULL!") {
                    alert("Character name couldn't be found!");
                    return;
                }
                DownloadHistory_ExampleChat(historyData, charName);
                break;
            case "cai_tavern_history":
                if (charName === "NULL!") {
                    alert("Character name couldn't be found!");
                    return;
                }
                DownloadHistory_TavernHistory(historyData, charName);
                break;
            default:
                break;
        }
    }


    async function Download_OfflineReading(data) {
        //const username = document.querySelector(`meta[cait_user]`)?.getAttribute('cait_user') || 'Guest';
        let default_character_name = data[0]?.name ?? data[data.length - 1]?.[0]?.name ?? data[0]?.[0]?.name;
        if (!default_character_name) {
            alert("Couldn't get the character's name");
        }
        const charPicture = await getAvatar('80', 'char');
        const userPicture = await getAvatar('80', 'user');

        let offlineHistory = [];

        if (Array.isArray(data[0])) {
            // This is from history
            data.forEach(chat => {
                const current_character_name = chat[0].name;
                const chatTemp = [];
                chat.forEach(msg => chatTemp.push({ isUser: msg.name != current_character_name, name: msg.name, message: encodeURIComponent(msg.message) }));
                offlineHistory.push(chatTemp);
            });
        } else {
            // This is from conversation
            const chatTemp = [];
            data.forEach(msg => chatTemp.push({ isUser: msg.name != default_character_name, name: msg.name, message: encodeURIComponent(msg.message) }));
            offlineHistory.push(chatTemp);
        }

        const finalData = {
            charPic: charPicture,
            userPic: userPicture,
            history: offlineHistory
        }

        var fileUrl = extAPI.runtime.getURL('ReadOffline.html');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                var fileContents = xhr.responseText;
                fileContents = fileContents.replace(
                    '<<<REPLACE_THIS_TEXT>>>',
                    JSON.stringify(finalData)
                );

                var blob = new Blob([fileContents], { type: 'text/html' });
                var url = URL.createObjectURL(blob);

                const link = document.createElement('a');
                link.href = url;
                link.download = default_character_name.replaceAll(' ', '_') + '_Offline.html';
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
                const message = `{{${messager}}}: ${msg.message}`;
                messageList.push(message);
            });
        });

        const definitionString = messageList.join("\n");

        const blob = new Blob([definitionString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = character_name.replaceAll(' ', '_') + '_Example.txt';
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
                if (!data.character || data.character.length === 0) {
                    // No permission because it's someone else's character
                    // /chat/character/info/ instead of /chat/character/ fixes that
                    const newUrl = "https://" + getMembership() + ".character.ai/chat/character/info/";
                    // To guarantee running once
                    if (fetchUrl != newUrl) {
                        console.log("Trying other character fetch method...");
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





    // UTILITY

    async function getUserId(settings = { withUsername: false }) {
        const AccessToken = getAccessToken();
        if (!AccessToken) return null;
        return await fetch(`https://${getMembership()}.character.ai/chat/user/`, {
            method: "GET",
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                "authorization": AccessToken
            }
        })
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => {
                if (!data?.user?.user?.id) {
                    return null;
                }
                if (settings.withUsername) {
                    return {
                        userId: data.user.user.id,
                        username: data.user.user.account.name
                    };
                }
                else {
                    return { userId: data.user.user.id };
                }
            })
            .catch(err => {
                console.log("Error while fetching user Id;", err)
                return null;
            });
    }

    async function getAvatar(avatarSize, identity) {
        // 80 / 400 - avatarSize
        // char / user - identity
        return new Promise(async (resolve, reject) => {
            try {
                const AccessToken = getAccessToken();
                const fetchUrl = identity === 'char' ? `https://${getMembership()}.character.ai/chat/character/info/` : `https://${getMembership()}.character.ai/chat/user/`;
                const settings = identity === 'char' ? {
                    method: "POST",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        "authorization": AccessToken
                    },
                    body: JSON.stringify({ external_id: getCharId() })
                } : {
                    method: "GET",
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        "authorization": AccessToken
                    }
                }

                if (AccessToken != null) {
                    const response = await fetch(fetchUrl, settings);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch data. Status: ${response.status}`);
                    }
                    const data = await response.json();
                    const avatarPath = identity === 'char' ? data.character?.avatar_file_name ?? null : data.user?.user?.account?.avatar_file_name ?? null;

                    if (avatarPath == null || avatarPath == "") {
                        resolve(null);
                    } else {
                        const avatarLink = `https://characterai.io/i/${avatarSize}/static/avatars/${avatarPath}`;
                        const avatarResponse = await fetch(avatarLink);
                        if (!avatarResponse.ok) {
                            throw new Error(`Failed to fetch avatar. Status: ${avatarResponse.status}`);
                        }
                        const avifBlob = await avatarResponse.blob();

                        // Create a FileReader to read the blob as a base64 string
                        const reader = new FileReader();

                        reader.onload = function () {
                            // The result property contains the base64 string
                            const base64String = reader.result;
                            resolve(base64String);
                        };

                        reader.onerror = function (error) {
                            reject(error);
                        };

                        // Read the blob as data URL (base64)
                        reader.readAsDataURL(avifBlob);
                    }
                } else {
                    resolve(null);
                }
            } catch (error) {
                reject(error);
            }
        });
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
