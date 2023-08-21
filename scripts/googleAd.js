
(() => {
    // This page is for google search ads on the right panel

    if (window.location.href.includes("https://www.google.com/search")) {
        window.addEventListener('load', function () {
            initialize()
        });
    }

    function initialize() {
        var container = document.getElementById('rcnt');
        if (!container) {
            return;
        }
        const body = document.getElementsByTagName("BODY")[0];
        const computedStyles = window.getComputedStyle(body);

        const props = {
            bgColor: computedStyles.backgroundColor,
            fontColor: computedStyles.color,
            borderColor: '#dadce0',
            linkColor: '#1a0dab',
            rhsWidth: computedStyles.getPropertyValue('--rhs-width'),
            logoUrl: 'brainypdf_icon.png'
        }
        if (props.bgColor === "rgb(32, 33, 36)") {
            props.borderColor = "#3c4043";
            props.linkColor = "#8ab4f8";
            props.logoUrl = 'brainypdf_icon_dark.png';
        }

        var adIconUrl = chrome.runtime.getURL(props.logoUrl);
        const adContent = `
            <div class="ad-wrapper">
                <div class="ad-explanation-cont">
                    <span>?</span>
                    <div class="ad-explanation">
                        <h4>Why am I seeing this?</h4>
                        <p>As the developer of CAI Tools, I would like to keep the extension free and up to date. Sponsorship helps. For reports and suggestions, <a href="https://www.github.com/irsat000/CAI-Tools/issues" target="_blank">CAI-Tools issues</a></p>
                        <a class="close-cai-ad">Close Ad</a>
                    </div>
                </div>
                <div class="logo-container">
                    <img src="${adIconUrl}" />
                </div>
                <div class="body">
                    <h3>BrainyPDF - Chat with any PDF</h3>
                    <p>
                        Join millions of students, researchers and professionals answering their questions about their documents with AI
                    </p>
                    <div class="footer">
                        <a href="#">Try it for free!</a>
                        <span>#3 on Product Hunt</span>
                    </div>
                </div>
            </div>
            `;
        const brainypdfAd = document.createElement('div');
        brainypdfAd.className = 'cai-tools-ad';
        brainypdfAd.innerHTML = adContent;

        brainypdfAd.style.backgroundColor = props.bgColor;
        brainypdfAd.style.border = "1px solid " + props.borderColor;
        brainypdfAd.querySelector('.footer span').style.border = "1px solid " + props.borderColor;
        brainypdfAd.querySelector('.body h3').style.color = props.fontColor;
        brainypdfAd.querySelector('.body p').style.color = props.fontColor;
        brainypdfAd.querySelector('.body span').style.color = props.fontColor;
        brainypdfAd.querySelector('.body .footer a').style.color = props.linkColor;

        brainypdfAd.querySelector('.ad-explanation').style.backgroundColor = props.bgColor;
        brainypdfAd.querySelector('.ad-explanation').style.border = "1px solid " + props.borderColor;
        brainypdfAd.querySelector('.ad-explanation .close-cai-ad').style.color = props.linkColor;

        brainypdfAd.addEventListener('click', (event) => {
            if (!event.target.closest(".ad-explanation-cont")) {
                window.open("https://brainypdf.com/", "_blank");
            }
        });

        brainypdfAd.querySelector('.close-cai-ad').addEventListener('click', (e) => {
            e.currentTarget.closest('.cai-tools-newpanel').remove();
        });

        const newPanel = document.createElement('div');
        newPanel.className = 'cai-tools-newpanel';
        if (props.rhsWidth) {
            newPanel.style.width = props.rhsWidth;
        } else {
            const center_col_width = container.getElementById('center_col').offsetWidth;
            const container_width = container.offsetWidth;
            newPanel.style.width = (container_width - center_col_width - 30) + "px";
        }

        newPanel.appendChild(brainypdfAd);

        var complementary = container.querySelector('[role="complementary"]');
        if (complementary) {
            complementary.insertBefore(newPanel, complementary.firstChild);
        }
        else if (container.children.length < 2) {
            if (container.querySelector('.F1IdKe')) {
                const childTop = container.querySelector('.F1IdKe').getBoundingClientRect().bottom;
                const parentTop = container.getBoundingClientRect().top;
                newPanel.style.marginTop = (childTop - parentTop + 20).toString() + "px";
            }
            container.appendChild(newPanel);
        }
    }

})();