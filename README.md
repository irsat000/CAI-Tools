# CAI Tools
This chrome/firefox extension is made for the purpose of getting the data of character.ai characters in various formats.

###### Links
Chrome store link: https://chrome.google.com/webstore/detail/cai-tools/nbhhncgkhacdaaccjbbadkpdiljedlje?hl=en

Firefox store link: https://addons.mozilla.org/en-US/firefox/addon/cai-tools/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search

Patreon for donation: https://www.patreon.com/Irsat

Note: Mobile phone users can use Kiwi browser and download the extension from Chrome Store.

# How to
For conversation and character data, navigate to a conversation pages. You can choose any conversation from histories page.
For history data, navigate to "View Chat Histories".

Click on CAI Tools button on top right corner to open the menu. You will see all the features in there.

Some of the features will be available after some time has passed.
# News
Character AI developers are constantly updating the website. This comes with many new issues for this extension and I would like to have your new Github issues or emails for reporting. Feature requests are also welcome.

# Known problems
- If the character has two replies back to back, it will switch the user and character from that point onwards. Only affects Oobabooga and Tavern chats.

# Feature List
### Conversation Page
###### Download Character (json)
It downloads the character file in formats supported by other AI platforms, such as Tavern and Oobabooga.
###### Download Character Card (png)
It downloads the character card. Only works on characters who have an avatar. You can further edit this card in https://zoltanai.github.io/character-editor/
###### Show Settings
Opens a box to show you all the settings you are allowed to see. Currently, only definitions might be hidden from you at most.
###### Download as Oobabooga chat
It downloads the conversation in Oobabooga chat format. You can continue the conversation in Oobabooga with it.
###### Download as Tavern chat
It downloads the conversation in Tavern chat format. You can continue the conversation in Tavern with it.
###### Download as example chat
This turns the conversation into example chat/definition format so you can use it in CAI and other AI chat platforms. It downloads a .txt file, which is a text document. All you need to do is copy paste the content.

### History Page
###### Download to read offline
It downloads an .html file which is a web page. You can read all your conversations offline with this file.
###### Raw Dump (json) [DEPRECATED]
It downloads the entire chat history and includes your character settings. You can use these two options to train models.
###### Raw Dump (anonymous) [DEPRECATED]
This is a better option if you want to hide your first name, username, display name etc.
###### Download as example chat
This turns all your history into example chat/definition format so you can use them in CAI and other AI chat platforms. It downloads a .txt file, which is a text document. All you need to do is copy paste the content.

###### Tavern Chats (zip/jsonl)
Similar to "Download as Tavern chat". You can download all chats in one go in Tavern format. It will download a zip file that contains .jsonl files.

### Misc
###### Drag and Remove Button
You can drag the button by its appendage on the left. If tapped 3 times consecutively on the appendage, it will remove the button until page reload.
###### Passive
Shows up to 999 chats in "View Chat Histories". You can download it all. The limit they put was originally 50.
###### JSON_to_ReadOffline.html
You can download this file individually. This can convert your existing .json character/history dumps into readable format, similar to "Download to read offline". Open this file, upload your dump in the input at middle-top of the page, that's all.

# Screenshot
![Preview](https://github.com/irsat000/CAI-Tools/assets/38238671/ff724f87-abb1-4d47-86a8-409d13cdea67)

# Contributors
See the list of [contributors.](AUTHORS)

# License
This project is licensed under the GNU GENERAL PUBLIC LICENSE - see the [LICENSE](LICENSE) file for details.
