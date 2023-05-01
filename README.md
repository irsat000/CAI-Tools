# CAI Tools
This chrome extension is made for the purpose of getting the data of beta.character.ai characters in various formats. 
###### Links
Chrome store link: https://chrome.google.com/webstore/detail/cai-tools/nbhhncgkhacdaaccjbbadkpdiljedlje?hl=en

Firefox store link: https://addons.mozilla.org/en-US/firefox/addon/cai-tools/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search
# Current Status
CharacterAI stopped giving us the history as extra. History features were unusable but I fixed it. Sadly it will be slower because they have no API service and they never will. Prior to v1.2.2 won't work. Since it will be really slow for bigger chat histories, it has a progress information.
# How to
For conversation data, navigate to a conversation. You can also choose the conversation from histories. 
For histories and settings data, navigate to "View Chat Histories".

Click on CAI Tools button on top right corner to open the menu and start fetching data. You will see all the features in there.
# Feature List
###### Download as Oobabooga chat
It downloads the conversation in Oobabooga chat format. You can continue the conversation in Oobabooga with it.
###### Download as TavernAI chat
It downloads the conversation in TavernAI chat format. You can continue the conversation in TavernAI with it.
###### Download to read offline
It downloads an .html file which is a web page. You can read all your conversations offline with this file.
###### Character Dump (json)
It downloads the entire chat history and includes your character settings. It's compatible with Character Creation app. https://zoltanai.github.io/character-editor/ You can dump it here and create a character .json file or card. You can theen use these files to create a new character in Pygmalion AI.
###### Character Dump (anonymous)
This is a better option if you want to hide your first name, username, display name etc. Feel free to dump this here https://dump.nopanda.io/ to train Pygmalion AI with your existing chats.
###### Download as example chat
This turns your chats into example chat/definition format so you can re-use them, both in CAI and Pygmalion AI. It downloads a .txt file, which is a text document. All you need to do is copy paste the content.

If you are in View Chat Histories page, it will download the entire history in this format. If you are in a conversation page, it will download only that chat.
###### Download Settings
It downloads an .html file. Even if a public character's settings are hidden, you can still download it and click on it to view it in browser. You will see the settings in key-value pairs. Definitions(chat examples) won't be showed unfortunately.
###### Passive
Shows up to 999 chats in "View Chat Histories". You can download it all. The limit they put was originally 50.

###### JSON_to_ReadOffline.html
You can download this file individually. This can convert your existing .json character/history dumps into readable format, similar to "Download to read offline". Open this file, upload your dump in the input at middle-top of the page, that's all.

# Screenshot
![Ekran Alıntısı](https://user-images.githubusercontent.com/38238671/230451305-596233fa-8541-452d-8d55-60dd0bb5e557.PNG)
