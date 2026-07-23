/**
 * components/media-loader.js
 * 簡約的媒體（圖片/影片）載入 Progress Bar 動態圖示
 */
(function() {
    // 1. 動態注入簡約的 CSS 樣式
    const style = document.createElement('style');
    style.textContent = `
        /* 定位與容器樣式 */
        .media-loading-parent-relative {
            position: relative !important;
        }

        /* 簡約的載入條容器 */
        .media-loading-bar-wrapper {
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 3px;
            background: rgba(42, 37, 34, 0.08); /* 極淡的深棕底色 */
            z-index: 20;
            overflow: hidden;
            pointer-events: none;
            transition: opacity 0.4s ease-out;
            opacity: 1;
        }

        /* 滾動的載入進度條 */
        .media-loading-bar-progress {
            width: 40%;
            height: 100%;
            background: #8A9A86; /* earth-sage 鼠尾草綠 */
            border-radius: 1.5px;
            position: absolute;
            top: 0;
            left: 0;
            animation: media-loading-flow 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes media-loading-flow {
            0% {
                transform: translateX(-100%);
            }
            100% {
                transform: translateX(250%);
            }
        }

        /* 淡出效果 */
        .media-loading-bar-fadeout {
            opacity: 0 !important;
        }
    `;
    document.head.appendChild(style);

    // 2. 追蹤已經加上 loader 的元素，避免重複處理
    const processedElements = new WeakMap();

    function attachLoader(el) {
        if (!el || (el.tagName !== 'IMG' && el.tagName !== 'VIDEO')) return;

        // 如果圖片已經載入完成，就不用加載 loader
        if (el.tagName === 'IMG' && el.complete && el.naturalWidth > 0) return;
        if (el.tagName === 'VIDEO' && el.readyState >= 3) return;

        // 如果沒有 src 或 src 為空，可能還沒真正設定，跳過（等 src 改變時會觸發 MutationObserver）
        if (!el.src && !el.currentSrc) return;

        // 如果已經處理過且 src 沒有改變，跳過
        const lastSrc = processedElements.get(el);
        const currentSrc = el.src || el.currentSrc;
        if (lastSrc === currentSrc) return;

        // 記錄目前的 src
        processedElements.set(el, currentSrc);

        const parent = el.parentElement;
        if (!parent) return;

        // 確保父元素有相對定位
        const parentStyle = window.getComputedStyle(parent);
        if (parentStyle.position === 'static') {
            parent.classList.add('media-loading-parent-relative');
        }

        // 檢查是否已有現存的 loader，若有先移除
        const oldLoader = parent.querySelector(':scope > .media-loading-bar-wrapper');
        if (oldLoader) {
            oldLoader.remove();
        }

        // 建立 loader 結構
        const wrapper = document.createElement('div');
        wrapper.className = 'media-loading-bar-wrapper';
        const progress = document.createElement('div');
        progress.className = 'media-loading-bar-progress';
        wrapper.appendChild(progress);

        parent.appendChild(wrapper);

        // 移除 loader 的函式
        let isRemoved = false;
        function removeLoader() {
            if (isRemoved) return;
            isRemoved = true;
            wrapper.classList.add('media-loading-bar-fadeout');
            setTimeout(() => {
                wrapper.remove();
            }, 400);

            // 清理事件監聽
            el.removeEventListener('load', removeLoader);
            el.removeEventListener('error', removeLoader);
            if (el.tagName === 'VIDEO') {
                el.removeEventListener('loadeddata', removeLoader);
                el.removeEventListener('canplay', removeLoader);
            }
        }

        // 監聽載入事件
        if (el.tagName === 'IMG') {
            el.addEventListener('load', removeLoader);
            el.addEventListener('error', removeLoader);
            
            // 安全防護：再次檢查是否已載入完成（因為有可能在事件綁定瞬間完成）
            if (el.complete && el.naturalWidth > 0) {
                removeLoader();
            }
        } else {
            el.addEventListener('loadeddata', removeLoader);
            el.addEventListener('canplay', removeLoader);
            el.addEventListener('error', removeLoader);

            if (el.readyState >= 3) {
                removeLoader();
            }
        }
    }

    // 3. 初始化現有元素
    function init() {
        const medias = document.querySelectorAll('img, video');
        medias.forEach(attachLoader);
    }

    // 當 DOM 準備好時執行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 4. 監聽 DOM 樹變化與 src 屬性變更（例如 lightbox 動態換圖）
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IMG' || node.tagName === 'VIDEO') {
                            attachLoader(node);
                        } else {
                            const children = node.querySelectorAll('img, video');
                            children.forEach(attachLoader);
                        }
                    }
                });
            } else if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
                const target = mutation.target;
                if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
                    attachLoader(target);
                }
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src']
    });
})();
