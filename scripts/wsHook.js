/* eslint-disable no-proto */
/* eslint-disable accessor-pairs */
/* eslint-disable no-global-assign */

/* wsHook.js
 * https://github.com/skepticfx/wshook
 * Reference: http://www.w3.org/TR/2011/WD-websockets-20110419/#websocket
 */

var wsHook = {};
(function () {
    // Mutable MessageEvent.
    // Subclasses MessageEvent and makes data, origin and other MessageEvent properites mutatble.
    function MutableMessageEvent(o) {
        this.bubbles = o.bubbles || false
        this.cancelBubble = o.cancelBubble || false
        this.cancelable = o.cancelable || false
        this.currentTarget = o.currentTarget || null
        this.data = o.data || null
        this.defaultPrevented = o.defaultPrevented || false
        this.eventPhase = o.eventPhase || 0
        this.lastEventId = o.lastEventId || ''
        this.origin = o.origin || ''
        this.path = o.path || new Array(0)
        this.ports = o.parts || new Array(0)
        this.returnValue = o.returnValue || true
        this.source = o.source || null
        this.srcElement = o.srcElement || null
        this.target = o.target || null
        this.timeStamp = o.timeStamp || null
        this.type = o.type || 'message'
        this.__proto__ = o.__proto__ || MessageEvent.__proto__
    }

    var before = wsHook.before = function (data, url, wsObject) {
        return data
    }
    var after = wsHook.after = function (e, url, wsObject) {
        return e
    }
    var modifyUrl = wsHook.modifyUrl = function (url) {
        return url
    }
    wsHook.resetHooks = function () {
        wsHook.before = before
        wsHook.after = after
        wsHook.modifyUrl = modifyUrl
    }

    var _WS = WebSocket
    WebSocket = function (url, protocols) {
        var WSObject
        url = wsHook.modifyUrl(url) || url
        this.url = url
        this.protocols = protocols
        if (!this.protocols) { WSObject = new _WS(url) } else { WSObject = new _WS(url, protocols) }

        var _send = WSObject.send
        WSObject.send = function (data) {
            arguments[0] = wsHook.before(data, WSObject.url, WSObject) || data
            _send.apply(this, arguments)
        }

        // Events needs to be proxied and bubbled down.
        WSObject._addEventListener = WSObject.addEventListener
        WSObject.addEventListener = function () {
            var eventThis = this
            // if eventName is 'message'
            if (arguments[0] === 'message') {
                arguments[1] = (function (userFunc) {
                    return function instrumentAddEventListener() {
                        arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
                        if (arguments[0] === null) return
                        userFunc.apply(eventThis, arguments)
                    }
                })(arguments[1])
            }
            return WSObject._addEventListener.apply(this, arguments)
        }

        Object.defineProperty(WSObject, 'onmessage', {
            'set': function () {
                var eventThis = this
                var userFunc = arguments[0]
                var onMessageHandler = function () {
                    arguments[0] = wsHook.after(new MutableMessageEvent(arguments[0]), WSObject.url, WSObject)
                    if (arguments[0] === null) return
                    userFunc.apply(eventThis, arguments)
                }
                WSObject._addEventListener.apply(this, ['message', onMessageHandler, false])
            }
        })

        return WSObject
    }
})()












wsHook.before = function (data, url, wsObject) {
    const updated = JSON.parse(data);
    if (updated.command === "create_and_generate_turn") {
        // If memory manager conditions are met, modify the message and send it
        if (checkMemoryManager()) {
            const message = updated.payload.turn.candidates[0].raw_content;
            updated.payload.turn.candidates[0].raw_content = addMemoryToMessage(message);
            return JSON.stringify(updated);
        }
    }
}




function checkMemoryManager(type) {
    try {
        // Check char id
        const charId = getCharId();
        if (!charId) {
            throw "Char ID couldn't be found at checkMemoryManager() function";
        }
        // No memory settings
        let caiToolsSettings = JSON.parse(localStorage.getItem('cai_tools'));
        if (!caiToolsSettings || !caiToolsSettings.memoryManager)
            return false;
        // This char's settings are not specified
        const charMemories = caiToolsSettings.memoryManager.mmList.find(obj => obj.char === charId);
        if (!charMemories || !charMemories.list.length === 0)
            return false;

        // Different actions
        if (type === "getList") {
            // Get memory list of the character
            return charMemories.list;
        }
        else {
            // Checks memory manager active status
            if (!caiToolsSettings.memoryManager.mmActive) {
                return false;
            }
            // Check skips
            const timesSkipped = charMemories.timesSkipped ?? 0;
            console.log("Memory manager frequency: ", caiToolsSettings.memoryManager.mmRemindFrequency, "Times skipped(excluding this):", timesSkipped);
            if (caiToolsSettings.memoryManager.mmRemindFrequency > 0 && (!timesSkipped || timesSkipped < caiToolsSettings.memoryManager.mmRemindFrequency)) {
                // Increase times skipped
                charMemories.timesSkipped = timesSkipped + 1;
                // Save to local storage for persistent data
                localStorage.setItem('cai_tools', JSON.stringify(caiToolsSettings));
                return false;
            }
            // Reset times skipped because now we are adding memories
            charMemories.timesSkipped = 0;
            // Save to local storage for persistent data
            localStorage.setItem('cai_tools', JSON.stringify(caiToolsSettings));
            console.log("Memory added, skip counter reset.");
            return true;
        }
    } catch (error) {
        console.log("Screenshot this error: " + error);
        return false;
    }
}

function addMemoryToMessage(original) {
    try {
        // Change commas and line breaks to prevent visual errors
        function formatMemory(memory) {
            return memory.replace(/"/g, '”').replace(/\n+/g, ' — ');
        }
        // Parse cai tools settings from storage
        let memoryPart = "";
        const charMemories = checkMemoryManager("getList");
        // Push the memories
        charMemories.forEach(memory => {
            memoryPart += `[-](#- "Memory: ${formatMemory(memory)}")\n`;
        });
        // Merge and send
        return memoryPart + original;
    } catch (error) {
        console.log("Screenshot this error: " + error);
        return original;
    }
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