

(() => {
    // These values must be updated when required
    const extAPI = browser; // chrome / browser
    const extVersion = "2.1.0";

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

    // xhook + wsHook
    const intercept_lib__url = extAPI.runtime.getURL("scripts/intercept.js");
    const interceptHookScript = document.createElement("script");
    interceptHookScript.crossOrigin = "anonymous";
    interceptHookScript.id = "xhook";
    interceptHookScript.onload = function () {
    };
    interceptHookScript.src = intercept_lib__url;
    // Insert both hooks
    const firstScript = document.getElementsByTagName("script")[0];
    firstScript.parentNode.insertBefore(interceptHookScript, firstScript);

    // Run at refresh or start as well
    handleLocationChange(null, { lastHref: '' });
    // A function to handle mutations
    function handleLocationChange(mutationsList, observer) {
        // Check if the URL has changed
        if (window.location.href !== observer.lastHref) {
            observer.lastHref = window.location.href;

            cleanDOM();
            // Perform actions based on the URL change
            const location = getPageType();
            // If new design
            if (location === 'character.ai/chat') {
                initialize_caitools();
            }
            // If chat2
            else if (location.includes('.character.ai/chat2')) {
                initialize_caitools();
            }
            // If legacy chat
            else if (location.includes('.character.ai/chat') && getCharId()) {
                initialize_caitools();
            }
            else {
                // Handle the modal reset
                //handleProgressInfoMeta("(Loading...)");
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

    // Reveal memory text
    document.addEventListener('click', (e) => {
        const el = e.target;
        if (el.matches('a[href="#-"], a[title]') && el.textContent === "-") {
            e.preventDefault();
            el.textContent = el.getAttribute('title');
            el.dataset.revealed_memory = true;
        } else if (el.dataset.revealed_memory) {
            e.preventDefault();
        }
    });


    // FETCH and LOADING ACTIONS
    function handleProgressInfo(text) {
        const progressInfo = document.querySelector('.cai_tools-cont .cait_progressInfo');
        if (progressInfo) progressInfo.textContent = text;
    }
    function handleProgressInfoHist(text) {
        const progressInfo = document.querySelector('.cai_tools-cont .cait_progressInfo_Hist');
        if (progressInfo) progressInfo.textContent = text;
    }

    function cleanDOM() {
        document.querySelectorAll('[data-tool="cai_tools"]').forEach(element => {
            element.remove();
        });
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
        handleProgressInfo(`(Ready!)`);
        console.log("FINISHED", newSimplifiedChat);
    }

    const fetchMessagesLegacy = async ({ AccessToken, nextPage, converExtId, chatData, fetchDataType }) => {
        await new Promise(resolve => setTimeout(resolve, 200));
        let url = `https://plus.character.ai/chat/history/msgs/user/?history_external_id=${converExtId}`;
        if (nextPage > 0) {
            url += `&page_num=${nextPage}`;
        }

        try {
            const res = await fetch(url, {
                method: "GET",
                headers: {
                    "authorization": AccessToken
                }
            });
            if (res.ok) {
                const data = await res.json();
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
                        chatData.history = newSimplifiedChat;
                        chatData.turns = [];
                    }

                    return;
                    // This was the last fetch for the chat
                }

                await fetchMessagesLegacy({
                    AccessToken: AccessToken,
                    nextPage: data.next_page,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            }
            else if (res.status === 429) {
                console.log("Rate limitting error. Will continue after 10 seconds.");
                await new Promise(resolve => setTimeout(resolve, 10000));
                return await fetchMessagesLegacy({
                    AccessToken: AccessToken,
                    nextPage: nextPage,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            }
            else
                throw res;
        } catch (error) {
            alert("Unexpected CAI Tools error, please report on Github");
            console.error("Unexpected CAI Tools error: " + error);
        }
    };

    const fetchMessagesChat2 = async ({ AccessToken, nextToken, converExtId, chatData, fetchDataType }) => {
        //Will be similar to fetchMessages. Next token will come from the previous fetch.
        //Last chat will give next token too.
        //New fetch will repond with null next_token variable and empty turns.
        await new Promise(resolve => setTimeout(resolve, 200));
        let url = `https://neo.character.ai/turns/${converExtId}/`;

        try {
            const res = await fetch(url + (nextToken ? `?next_token=${nextToken}` : ""), {
                "method": "GET",
                "headers": {
                    "authorization": AccessToken,
                }
            })
            if (res.ok) {
                const data = await res.json();
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
                        chatData.history = newSimplifiedChat;
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
            }
            else if (res.status === 429) {
                console.log("Rate limitting error. Will continue after 10 seconds.");
                await new Promise(resolve => setTimeout(resolve, 10000));
                return await fetchMessagesChat2({
                    AccessToken: AccessToken,
                    nextToken: nextToken,
                    converExtId: converExtId,
                    chatData: chatData,
                    fetchDataType: fetchDataType
                });
            }
            else
                throw res;
        } catch (error) {
            alert("Unexpected CAI Tools error, please report on Github");
            console.error("Unexpected CAI Tools error: " + error);
        }
    }

    const fetchHistory = async () => {
        const AccessToken = getAccessToken();
        const charId = getCharId();
        // Safety check
        if (!AccessToken || !charId) {
            return;
        }
        let meta = document.querySelector('meta[cai_charId="' + charId + '"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('cai_charId', charId);
            document.head.appendChild(meta);
        }
        // Check if fetching process already started for this character
        if (meta.getAttribute('fetchHistStarted')) {
            if (meta.getAttribute('cai_history')) {
                handleProgressInfoHist(`(Ready!)`);
            }
            return;
        }
        meta.setAttribute('fetchHistStarted', 'true');
        document.querySelector('.cai_tools-cont .fetchHistory-btn').classList.add('started');

        // Fetch chat lists from legacy and new
        let chatList = [];
        try {
            const res_legacy = await fetch('https://plus.character.ai/chat/character/histories_v2/', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    "authorization": AccessToken
                },
                body: JSON.stringify({
                    external_id: charId,
                    number: 999
                })
            })
            const res_new = await fetch(`https://neo.character.ai/chats/?character_ids=${charId}&num_preview_turns=2`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    "authorization": AccessToken
                }
            })
            if (res_legacy.ok) {
                const data = await res_legacy.json();
                if (data.histories) {
                    // Filter the empty chats
                    data.histories = data.histories.filter(chat => chat.msgs?.length > 1 || false);
                    // Add to list
                    chatList.push(...data.histories.map(chat => ({ id: chat.external_id, date: new Date(chat.created), type: "legacy" })));
                }
            }
            if (res_new.ok) {
                const data = await res_new.json();
                if (data.chats) {
                    // Filter the empty chats
                    data.chats = data.chats.filter(chat => chat.preview_turns?.length > 1 || false);
                    // Add to list
                    chatList.push(...data.chats.map(chat => ({ id: chat.chat_id, date: new Date(chat.create_time), type: "chat2" })));
                }
            }
        } catch (error) {
            console.log("CAI Tools error: " + error);
        }

        if (!chatList.length) {
            alert("Failed to get history");
            return;
        }

        // Sort by date in descending order, new chats first
        chatList.sort((a, b) => b.date - a.date);

        // Fetching process data
        let finalHistory = [];
        let fetchedChatNumber = 1;
        const historyLength = chatList?.length || 0;

        // Fetch history
        for (const chatInfo of chatList) {
            const { id, date, type } = chatInfo;
            const chatData = { history: [], turns: [] }

            if (type === "legacy") {
                await fetchMessagesLegacy({
                    AccessToken: AccessToken,
                    nextPage: 0,
                    converExtId: id,
                    chatData: chatData,
                    fetchDataType: "history"
                });
            } else {
                await fetchMessagesChat2({
                    AccessToken: AccessToken,
                    nextToken: null,
                    converExtId: id,
                    chatData: chatData,
                    fetchDataType: "history"
                });
            }
            // Add to final
            finalHistory.push({ date: date, chat: chatData.history });
            // Increase the fetched index
            fetchedChatNumber++;
            // Update the informative text
            handleProgressInfoHist(`(Loading history... ${fetchedChatNumber}/${historyLength})`);
        }

        // Save history in meta tag
        meta.setAttribute('cai_history', JSON.stringify(finalHistory));
        // Update the informative text
        handleProgressInfoHist(`(Ready!)`);
        console.log("FINISHED", finalHistory);
    };

    const fetchConversation = async (converExtId) => {
        const AccessToken = getAccessToken();
        if (!AccessToken) return; // Not necessary because we check it before that already
        const chatData = { history: [], turns: [] };
        let args = {
            AccessToken: AccessToken,
            converExtId: converExtId,
            chatData: chatData,
            fetchDataType: "conversation"
        };

        const location = getPageType();
        // If new design or chat2
        if (location === 'character.ai/chat' || location.includes('.character.ai/chat2')) {
            args.nextToken = null;
            await fetchMessagesChat2(args);
        }
        // If legacy chat
        else if (location.includes('.character.ai/chat') && getCharId()) {
            args.nextPage = 0;
            await fetchMessagesLegacy(args);
        }
    }

    // FETCH END


    // CAI Tools - DOM

    function initialize_caitools() {
        const BODY = document.getElementsByTagName('BODY')[0];

        // CAI TOOLS Elements
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
                            <li data-cait_type='character_copy'>Create Private Copy (NEW!)</li>
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
                        <h6>History</h6>
                        <div class="history_loading-cont">
                            <button type="button" class="fetchHistory-btn">Start fetch</button>
                            <span class='cait_progressInfo_Hist'>(Waiting command...)</span>
                        </div>
                        <ul>
                            <li data-cait_type='cai_hist_offline_read'>Offline History</li>
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
                        <div class="caits-content">
                        </div>
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
                        <textarea class="mm_new_memory" name="new_memory" placeholder='New memory (Line breaks are not recommended but will work) (Click "Add New" and "Save")'></textarea>
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
            <div class="cait_info-cont" data-tool="cai_tools">
                <div class="cait_info">
                    <div class="caiti_header">
                        <h4>CAI Tools</h4><span class="caiti-close">x</span>
                    </div>
                    <div class="caiti-body">
                    </div>
                </div>
            </div>
        `;
        BODY.appendChild(parseHTML_caiTools(cai_tools_string));

        // SHOW MODAL
        document.querySelector('.cai_tools-btn').addEventListener('mouseup', openModal);
        document.querySelector('.cai_tools-btn').addEventListener('touchstart', openModal);
        async function openModal() {
            const AccessToken = getAccessToken();
            if (!AccessToken) {
                alert("Access Token is not ready yet.");
                return;
            }

            // Add active class to show
            document.querySelector('.cai_tools-cont').classList.add('active');

            // Check if the conversation is already fetched
            let currentConverExtId = await getCurrentConverId();
            const checkExistingConver = document.querySelector(`meta[cai_converExtId="${currentConverExtId}"]`);
            if (checkExistingConver?.getAttribute('cai_conversation') != null) {
                handleProgressInfo('(Ready!)')
                return;
            }
            // If fetch didn't start
            else if (!checkExistingConver?.getAttribute('cai_fetchStarted')) {
                // Set fetch started to prevent re-fetching
                if (checkExistingConver) {
                    checkExistingConver.setAttribute('cai_fetchStarted', 'true');
                }
                else {
                    const meta = document.createElement('meta');
                    meta.setAttribute('cai_converExtId', currentConverExtId);
                    meta.setAttribute('cai_fetchStarted', 'true');
                    document.head.appendChild(meta);
                }
                // Fetch conversation
                fetchConversation(currentConverExtId);
            }
        }

        // Close CAI Tools modals
        document.querySelector('.cai_tools-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cai_tools-cont') || target.classList.contains('cait-close')) {
                close_caiToolsModal();
            }
        });
        document.querySelector('.cait_settings-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_settings-cont') || target.classList.contains('caits-close')) {
                close_caitSettingsModal();
            }
        });
        document.querySelector('.cait_memory_manager-cont').addEventListener('mousedown', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_memory_manager-cont') || target.classList.contains('caitmm-close')) {
                setTimeout(() => {
                    close_caitMemoryManagerModal();
                    // To prevent further click by accident, mousedown immediately runs, not when mouse is lifted
                }, 200);
            }
        });
        document.querySelector('.cait_info-cont').addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('cait_info-cont') || target.classList.contains('caiti-close')) {
                close_caitInfoModal();
            }
        });

        // Features on click
        document.querySelector('.cai_tools-cont [data-cait_type="memory_manager"]').addEventListener('click', () => {
            MemoryManager();
            close_caiToolsModal();
        });

        document.querySelector('.cai_tools-cont [data-cait_type="character_hybrid"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_hybrid' };
            DownloadCharacter(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="character_card"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_card' };
            DownloadCharacter(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="character_settings"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_character_settings' };
            DownloadCharacter(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="character_copy"]').addEventListener('click', () => {
            const args = { downloadType: 'character_copy' };
            DownloadCharacter(args);
            close_caiToolsModal();
        });

        document.querySelector('.cai_tools-cont [data-cait_type="cai_offline_read"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_offline_read' };
            DownloadConversation(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="cai_duplicate_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_duplicate_chat' };
            DownloadConversation(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="cai_duplicate_chat_full"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_duplicate_chat_full' };
            DownloadConversation(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="oobabooga"]').addEventListener('click', () => {
            const args = { downloadType: 'oobabooga' };
            DownloadConversation(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="tavern"]').addEventListener('click', () => {
            const args = { downloadType: 'tavern' };
            DownloadConversation(args);
            close_caiToolsModal();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { downloadType: 'example_chat' };
            DownloadConversation(args);
            close_caiToolsModal();
        });

        document.querySelector('.cai_tools-cont .fetchHistory-btn').addEventListener('click', () => {
            fetchHistory();
        });
        document.querySelector('.cai_tools-cont [data-cait_type="cai_hist_offline_read"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_hist_offline_read' };
            DownloadHistory(args);
            close_caiToolsModal();
        });
    }

    function close_caiToolsModal() {
        document.querySelector('.cai_tools-cont').classList.remove('active');
    }
    function close_caitSettingsModal() {
        document.querySelector('.cait_settings-cont').classList.remove('active');
    }
    function close_caitMemoryManagerModal() {
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
                    alert("Couldn't be saved. Check console for error using F12 and Console tab, then please report on github.");
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
    async function DownloadConversation(args) {
        const currentConversation = await getCurrentConverId();
        if (!currentConversation) {
            alert("Current conversation ID couldn't be found.")
            return;
        }
        const chatData =
            JSON.parse(document.querySelector(`meta[cai_converExtId="${currentConversation}"]`)?.getAttribute('cai_conversation') || 'null');
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
            let newChatPage_Redesign = null;
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
            let chatIsCreated = false;

            // On socket open
            const sendCreateChatMessage = () => {
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
            }
            // Check if the socket is already open
            if (socket.readyState === 1) {
                sendCreateChatMessage();
            } else if (socket.readyState === 0) {
                // Add event listener for the "open" event
                socket.addEventListener("open", () => {
                    sendCreateChatMessage();
                });
            } else {
                throw "Socket readyState is not 0 or 1, it's: " + socket.readyState;
            }

            // Handle chat creation error when trying to connect to websocket
            socket.addEventListener("close", (event) => {
                if (!chatIsCreated) {
                    alert('Error when trying to create new chat.');
                    console.log("CAI Tools error: " + event);
                }
            });

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
                    newChatPage_Redesign = `https://character.ai/chat/${charId}?hist=${chatId}`;
                    console.log(newChatPage, newChatPage_Redesign);
                    chatIsCreated = true;
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
                        infoBody.innerHTML = `
                            <p>
                                Complete! Duplicate chat;
                                <br /><br />
                                <a href="${newChatPage}" target="_blank">Old design chat link</a>
                                <br /><br />
                                <a href="${newChatPage_Redesign}" target="_blank">Redesign chat link</a>
                            </p>
                        `;
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
            JSON.parse(document.querySelector('meta[cai_charId="' + charId + '"]')?.getAttribute('cai_history') || 'null');

        if (historyData == null) {
            alert("Data doesn't exist or not ready. Try again later.")
            return;
        }

        const charName = historyData[0]?.[0]?.name ?? "NULL!";

        const dtype = args.downloadType;
        switch (dtype) {
            case "cai_hist_offline_read":
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
        let default_character_name = data[0]?.name ?? data[data.length - 1]?.chat[0]?.name ?? data[0]?.chat[0]?.name;
        if (!default_character_name) {
            alert("Couldn't get the character's name");
        }
        const charPicture = await getAvatar('80', 'char');
        const userPicture = await getAvatar('80', 'user');

        let offlineHistory = [];

        if (Array.isArray(data[0].chat)) {
            // This is from history
            data.forEach(chat => {
                const chatTemp = [];
                chat.chat.forEach(msg => chatTemp.push({ isUser: msg.isHuman, name: msg.name, message: encodeURIComponent(msg.message) }));
                offlineHistory.push({ date: chat.date, chat: chatTemp });
            });
        } else {
            // This is from conversation
            const chatTemp = [];
            data.forEach(msg => chatTemp.push({ isUser: msg.isHuman, name: msg.name, message: encodeURIComponent(msg.message) }));
            offlineHistory.push({ date: data[0].date, chat: chatTemp });
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
                link.download = default_character_name ? default_character_name.replaceAll(' ', '_') + '_Offline.html' : 'Offline_Chat.html';
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
        const fetchUrl = "https://plus.character.ai/chat/character/";
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
                    const newUrl = "https://plus.character.ai/chat/character/info/";
                    // To guarantee running once
                    if (fetchUrl != newUrl) {
                        console.log("Trying other character fetch method...");
                        fetchCharacterInfo(newUrl, AccessToken, payload, downloadType);
                    }
                    return;
                }

                // Get character info
                let { name, title, description, greeting, avatar_file_name, definition, categories } = data.character;

                if (downloadType === "cai_character_hybrid") {
                    const hybridCharacter = {
                        char_name: name,
                        char_persona: description,
                        char_greeting: greeting,
                        world_scenario: "",
                        example_dialogue: definition ?? "",

                        name: name,
                        description: description,
                        first_mes: greeting,
                        scenario: "",
                        mes_example: definition ?? "",
                        personality: title,

                        metadata: metadata
                    }

                    const Data_FinalForm = JSON.stringify(hybridCharacter);
                    const blob = new Blob([Data_FinalForm], { type: 'text/json' });
                    const downloadUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = downloadUrl;
                    link.download = name.replaceAll(' ', '_') + '.json';
                    link.click();
                }
                else if (downloadType === "cai_character_card") {
                    if (avatar_file_name == null ||
                        avatar_file_name == "" ||
                        avatar_file_name.length == 0
                    ) {
                        alert("Only works on characters who have an avatar.")
                        return;
                    }

                    const cardCharacter = {
                        name: name,
                        description: description,
                        first_mes: greeting,
                        scenario: "",
                        mes_example: definition ?? "",
                        personality: title,

                        metadata: metadata
                    }

                    const avatarLink = `https://characterai.io/i/400/static/avatars/${avatar_file_name}`;

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
                                        link.download = name ?? 'character_card.png';
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
                    const avatarLink = avatar_file_name && avatar_file_name.length > 0
                        ? `https://characterai.io/i/400/static/avatars/${avatar_file_name}`
                        : null;

                    // Populate
                    const settingsContent = `
                        <span class="caits_field_name">Name</span>
                        <p>${name}</p>
                        <span class="caits_field_name">Short Description</span>
                        <p>${title}</p>
                        <span class="caits_field_name">Long Description</span>
                        <p>${description.trim().length === 0 ? '(Empty)' : description}</p>
                        <span class="caits_field_name">Greeting</span>
                        <p>${parseMessageText(greeting)}</p>
                        <span class="caits_field_name">Avatar Link</span>
                        <p>${avatarLink ? `<a href="${avatarLink}" target="_blank">${avatarLink}</a>` : '(No avatar)'}</p>
                        <span class="caits_field_name">Definition</span>
                        <p>${definition == null ? '(Definition is private)' : definition.trim().length === 0 ? '(Empty)' : parseMessageText(definition)}</p>
                    `;

                    // Container
                    const settingsContainer = document.querySelector(".cait_settings .caits-content");
                    if (!settingsContainer) return; // Not necessary
                    settingsContainer.innerHTML = settingsContent;
                    settingsContainer.closest('.cait_settings-cont').classList.add('active');
                }
                else if (downloadType === "character_copy") {
                    const payload = {
                        title: title,
                        name: name,
                        identifier: "id:" + crypto.randomUUID(),
                        categories: categories ? categories.map(c => c.name) : [],
                        visibility: "PRIVATE",
                        copyable: false,
                        description: description,
                        greeting: greeting,
                        definition: definition ?? "",
                        avatar_rel_path: avatar_file_name,
                        img_gen_enabled: false,
                        base_img_prompt: "",
                        strip_img_prompt_from_msg: false,
                        voice_id: "",
                        default_voice_id: ""
                    };
                    fetch("https://plus.character.ai/chat/character/create/", {
                        method: "POST",
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            "authorization": AccessToken
                        },
                        body: JSON.stringify(payload)
                    })
                        .then((res) => res.ok ? res.json() : Promise.reject(res))
                        .then((data) => {
                            if (!data.character || !data.character.external_id)
                                return;
                            // Inform the user
                            const infoContainer = document.querySelector('.cait_info-cont');
                            const infoBody = infoContainer.querySelector('.caiti-body');
                            infoBody.innerHTML = `
                                <p>
                                    Your private character;
                                    <br /><br />
                                    <a href="https://beta.character.ai/chat2?char=${data.character.external_id}" target="_blank">Old design link</a>
                                    <br /><br />
                                    <a href="https://character.ai/chat/${data.character.external_id}" target="_blank">Redesign link</a>
                                </p>
                            `;
                            infoContainer.classList.add('active');
                        })
                        .catch(err => console.log(err));
                }
            })
            .catch(err => console.log(err));
    }

    // CHARACTER DOWNLOAD - END





    // UTILITY

    async function getUserId(settings = { withUsername: false }) {
        const AccessToken = getAccessToken();
        if (!AccessToken) return null;
        return await fetch(`https://plus.character.ai/chat/user/`, {
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
                const fetchUrl = identity === 'char' ? `https://plus.character.ai/chat/character/info/` : `https://plus.character.ai/chat/user/`;
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

                if (!AccessToken) {
                    resolve(null);
                }

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
            } catch (error) {
                reject(error);
            }
        });
    }

    function getCharId() {
        const location = getPageType();
        // If new design
        if (location === 'character.ai/chat') {
            // path only: /chat/[charId]
            return window.location.pathname.split('/')[2];
        }
        // If legacy
        else {
            // path with query string: /chat?char=[charId]
            const url = new URL(window.location.href);
            const searchParams = new URLSearchParams(url.search);
            const charId = searchParams.get('char');
            return charId;
        }
    }

    // Get the "identification" of a page
    function getPageType() {
        // Examples:
        // character.ai/chat
        // *.character.ai/chat2
        // *.character.ai/chat
        return window.location.hostname + '/' + window.location.pathname.split('/')[1];
    }
    // Get the progress info from cai tools box, such as "(Ready!)" or "(Loading...)"
    function getProgressInfo() {
        return document.querySelector('.cai_tools-cont .cait_progressInfo')?.textContent;
    }

    // Might be unnecessary when I have getMembership()
    function checkPlus() {
        return window.location.hostname.indexOf("plus") > -1 ? true : false;
    }

    function getMembership() {
        return window.location.hostname.indexOf("plus") > -1 ? "plus" : "beta";
    }

    function getAccessToken() {
        const meta = document.querySelector('meta[cai_token]');
        return meta ? meta.getAttribute('cai_token') : null;
    }

    async function getCurrentConverId() {
        try {
            // Get necessary info
            const AccessToken = getAccessToken();
            const charId = getCharId();
            if (!AccessToken || !charId) {
                return null;
            }

            const url = new URL(window.location.href);
            const searchParams = new URLSearchParams(url.search);
            const location = getPageType();

            // If history id is in the query strings
            const historyId = searchParams.get('hist');
            if (historyId) {
                return historyId;
            }
            // If user opened the recent chat, and if the page new design or chat2
            else if (location === 'character.ai/chat' || location.includes('.character.ai/chat2')) {
                const res = await fetch(`https://neo.character.ai/chats/recent/${charId}`, {
                    method: "GET",
                    headers: {
                        "authorization": AccessToken
                    }
                })
                if (res.ok) {
                    const data = await res.json();
                    return data.chats[0].chat_id;
                }
            }
            // If legacy recent
            else {
                const res = await fetch(`https://plus.character.ai/chat/history/continue/`, {
                    method: "POST",
                    headers: {
                        "authorization": AccessToken
                    },
                    body: JSON.stringify({
                        character_external_id: charId,
                        history_external_id: null
                    })
                })
                if (res.ok) {
                    const data = await res.json();
                    return data.external_id;
                }
            }
        } catch (error) {
            console.error(error);
            return null;
        }
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

    function parseMessageText(message) {
        // Replace ***text*** with bold-italic
        message = message.replace(/\*\*\*([\s\S]*?)\*\*\*/g, '<span class="bold-italic">$1</span>');
        // Replace **text** with bold
        message = message.replace(/\*\*([\s\S]*?)\*\*/g, '<span class="bold">$1</span>');
        // Replace *text* with italic
        message = message.replace(/\*([\s\S]*?)\*/g, '<span class="italic">$1</span>');
        // Replace newline (\n) with line break (<br>)
        message = message.replace(/\n/g, '<br>');
        return message;
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


    /*function removeSpecialChars(str) {
        return str
            .replace(/[\\]/g, ' ')
            .replace(/[\"]/g, ' ')
            .replace(/[\/]/g, ' ')
            .replace(/[\b]/g, ' ')
            .replace(/[\f]/g, ' ')
            .replace(/[\n]/g, ' ')
            .replace(/[\r]/g, ' ')
            .replace(/[\t]/g, ' ');
    };*/








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
