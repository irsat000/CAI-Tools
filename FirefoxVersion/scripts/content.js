

(() => {
    const firstScript = document.getElementsByTagName("script")[0];
    const xhook_lib__url = browser.runtime.getURL("scripts/xhook.min.js");
    const xhookScript = document.createElement("script");
    xhookScript.crossOrigin = "anonymous";
    xhookScript.id = "xhook";
    xhookScript.onload = function () {
        initialize_options_DOM();
    };
    xhookScript.src = xhook_lib__url;
    firstScript.parentNode.insertBefore(xhookScript, firstScript);


    browser.runtime.onMessage.addListener((obj, sender, response) => {
        const { name, args } = obj;
        if (name === "DownloadCAIHistory") {
            DownloadHistory(args);
        }
        else if (name === "DownloadCharSettings") {
            DownloadSettings(args);
        }
        else if (name === "Create_Options_DOM") {
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
                        <span class="cait_warning">*Website update - Found a way but slower now*</span>
                        <h6>This conversation</h6>
                        <span class='cait_progressInfo'>(Loading...)</span>
                        <ul>
                            <li data-cait_type='oobabooga'>Download as Oobabooga chat</li>
                            <li data-cait_type='example_chat'>Download as example chat/definition</li>
							<li data-cait_type='tavern'>Download as TavernAI chat</li>
                        </ul>
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


        ch_header.querySelector('.cai_tools-cont [data-cait_type="oobabooga"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'oobabooga' };
            DownloadConversation(args);
            close_caiToolsModal(ch_header);
        });
        ch_header.querySelector('.cai_tools-cont [data-cait_type="example_chat"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'example_chat' };
            DownloadConversation(args);
            close_caiToolsModal(ch_header);
        });
		ch_header.querySelector('.cai_tools-cont [data-cait_type="tavern"]').addEventListener('click', () => {
            const args = { extId: currentConverExtId, downloadType: 'tavern' };
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
                        <span class="cait_warning">*Website update - Found a way but slower now*</span>
                        <h6>Character history</h6>
                        <span class='cait_progressInfo'>(Loading...)</span>
                        <ul>
                            <li data-cait_type='cai_offline_read'>Download to read offline</li>
                            <li data-cait_type='example_chat'>Download as example chat (txt)</li>
                            <li data-cait_type='cai_dump'>Character Dump (json)</li>
                            <li data-cait_type='cai_dump_anon'>Character Dump (anonymous)</li>
                        </ul>
                        <h6>Misc</h6>
                        <ul>
                            <li data-cait_type='cai_settings_view'>Download Settings (viewer)</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
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
        ch_header.querySelector('.cai_tools-cont [data-cait_type="cai_settings_view"]').addEventListener('click', () => {
            const args = { downloadType: 'cai_settings_view' };
            DownloadSettings(args);
            close_caiToolsModal(ch_header);
        });
    }

    function close_caiToolsModal(container) {
        container.querySelector('.cai_tools-cont').classList.remove('active');
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
            case "example_chat":
                DownloadConversation_ChatExample(chatData, args);
                break;
			case "tavern":
                DownloadConversation_Tavern(chatData, args);
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

    function DownloadConversation_ChatExample(chatData, args) {
        const messageList = [];
        chatData.filter(msg => msg.is_alternative === false)
            .forEach(msg => {
                const message = "{{" + msg.src__name + "}}: " + msg.text;
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
	
	function DownloadConversation_Tavern(chatData, args) {
	  const messages = [];
	  const userName = 'You';

	  chatData.filter(msg => msg.is_alternative === false)
		.forEach(msg => {
		  const name = msg.src__name;
		  const message = msg.text;
		  messages.push({ name, message });
		});

	  const characterName = messages[0].name;
	  const createDate = Date.now();
	  const initialPart = JSON.stringify({
		user_name: userName,
		character_name: characterName,
		create_date: createDate,
	  });

	  let secondSpeaker = null;
	  const totalMessages = messages.length;
	  const outputLines = [initialPart];

	  messages.forEach((message, index) => {
		if (index === 1 && !secondSpeaker) {
		  secondSpeaker = message.name;
		}

		if (message.name === secondSpeaker) {
		  message.name = userName;
		}

		const isUser = message.name === userName;
		const sendDate = Date.now();

		const formattedMessage = JSON.stringify({
		  name: message.name,
		  is_user: isUser,
		  is_name: true,
		  send_date: sendDate,
		  mes: message.message,
		});

		outputLines.push(formattedMessage);
	  });

	  const outputString = outputLines.join('\n');

	  const blob = new Blob([outputString], { type: 'application/json' });
	  const url = URL.createObjectURL(blob);
	  const link = document.createElement('a');
	  link.href = url;
	  link.download = `${args.extId.substring(0, 8)}_${args.downloadType}_Chat.jsonl`;
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
                DownloadHistory_ExampleChat(historyData, character_name);
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

        var fileUrl = browser.runtime.getURL('ReadOffline.html');
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
            obj.msgs.filter(msg => msg.is_alternative === false && msg.src != null && msg.src.name != null && msg.text != null)
                .forEach(msg => {
                    const message = "{{" + msg.src.name + "}}: " + msg.text;
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

    //HISTORY - END






    // SETTINGS

    function DownloadSettings(args) {
        if (!window.location.href.includes("character.ai/histories")) {
            alert("Failed. Works only in histories page.");
            return;
        }

        const charId = getCharId();
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
            default:
                break;
        }
    }

    function DownloadSettings_View(settingsData) {
        //prevents json errors (/r /n etc)
        settingsData.character.description = encodeURIComponent(settingsData.character.description);
        settingsData.character.greeting = encodeURIComponent(settingsData.character.greeting);
        if (settingsData.character.definition != null) {
            settingsData.character.definition = encodeURIComponent(settingsData.character.definition);
        }

        var fileUrl = browser.runtime.getURL('ReadCharSettings.html');
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

})();
