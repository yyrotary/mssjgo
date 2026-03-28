
        const MODAL_SUPPORT_SLOTS_CONFIG = {
            enabled: true,
            labels: {
                ja: {
                    head: '応援ツール',
                    note1: 'Gemini連携ツール',
                    note2: '仕事・学習プロンプト集'
                },
                en: {
                    head: 'Support Tools',
                    note1: 'Gemini helper extension',
                    note2: 'Prompt library for work/study'
                },
                ko: {
                    head: '응원 도구',
                    note1: 'Gemini 연동 확장 도구',
                    note2: '업무/학습 프롬프트 모음'
                },
                zh: {
                    head: '应援工具',
                    note1: 'Gemini 联动扩展工具',
                    note2: '工作/学习提示词合集'
                }
            },
            slots: [
                {
                    bannerId: 'support_bananagm_square',
                    slotName: 'modal_left_support_1',
                    title: 'BananaGM',
                    href: 'https://chromewebstore.google.com/detail/%F0%9F%8D%8C-bananagm/ipjhfbcgjmbiledamkaghljnneabaock?authuser=0'
                },
                {
                    bannerId: 'support_bananaprompt_square',
                    slotName: 'modal_left_support_2',
                    title: 'BananaPrompt',
                    href: 'https://furoku.github.io/bananaX/projects/banana-prompt/'
                }
            ]
        };

        function configureModalBizAd(item) {
            const container = document.getElementById('m-support-slots');
            if (!container) return;

            const isBiz = !!(item && item.id && item.id.startsWith('biz_'));
            if (!isBiz || !MODAL_SUPPORT_SLOTS_CONFIG.enabled) {
                container.classList.remove('active');
                return;
            }

            const lang = MODAL_SUPPORT_SLOTS_CONFIG.labels[PAGE_LANG] || MODAL_SUPPORT_SLOTS_CONFIG.labels.en;
            const head = document.getElementById('m-support-head');
            if (head) head.textContent = lang.head;

            MODAL_SUPPORT_SLOTS_CONFIG.slots.forEach((cfg, idx) => {
                const el = document.getElementById(`m-support-slot-${idx + 1}`);
                if (!el) return;

                const url = new URL(cfg.href, window.location.origin);
                url.searchParams.set('utm_source', 'bananax_modal_support');
                url.searchParams.set('utm_medium', 'support_slot');
                url.searchParams.set('utm_campaign', 'infographic_evaluation');
                url.searchParams.set('utm_content', item.id || 'biz_unknown');

                el.href = url.toString();
                el.dataset.slotName = cfg.slotName;
                el.dataset.bannerId = cfg.bannerId;

                const title = el.querySelector('.m-support-item-title');
                const note = el.querySelector('.m-support-item-note');
                if (title) title.textContent = cfg.title;
                if (note) note.textContent = idx === 0 ? lang.note1 : lang.note2;

                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    event: 'support_slot_view',
                    site: 'evaluation',
                    slot_name: cfg.slotName,
                    banner_id: cfg.bannerId,
                    item_id: item.id
                });
            });

            container.classList.add('active');
        }

        let data = [];
        let styleRanking = null; // GA4-driven popularity ranking
        let viewMode = (localStorage.getItem('viewMode') || 'list') === 'tile' ? 'overview' : 'masonry'; // 'overview' (App Library) or 'masonry' (Card Grid)

        // Beginner tips (삼행시 format: 3-line poem)
        const beginnerTips = [
            // 즐겨찾기 폴더용 (index 0-3)
            { line1: '하트를 누르면', line2: '즐겨찾기에 저장', line3: '다시 사용 가능' },
            { line1: '카드를 탭하면', line2: '프롬프트 바로 복사', line3: 'AI에 붙여넣기' },
            { line1: '추천 탭 확인', line2: '모두가 사용한', line3: '인기 12개' },
            { line1: '오른쪽 위 토글', line2: 'Pro로 전환하면', line3: '12개 저장 가능' },
            // 기록 폴더용 (index 4-7)
            { line1: '복사하면 자동으로', line2: '기록에 저장되어', line3: '잃어버리지 않아요' },
            { line1: '탭으로 필터링', line2: '비즈니스? 다이어그램?', line3: '자유롭게 탐색' },
            { line1: '사용할수록', line2: '배지가 늘어나요', line3: '모두 모아보세요' },
            { line1: '깃발 아이콘 탭', line2: '언어를 전환하면', line3: '전 세계에서 사용' }
        ];
        let tipIndex = 0;
        let activeTag = 'ALL';
        let searchQuery = '';
        const tabArea = document.getElementById('tabArea');
        const libraryContainer = document.getElementById('libraryContainer');
        const galleryContainer = document.getElementById('grid');

        let detailData = null;
        let detailDataPromise = null;

        function normalizeImagePath(item) {
            if (!item || !item.img) return item;
            if (item.img.startsWith('../') || /^https?:\/\//i.test(item.img)) return item;
            return { ...item, img: '../' + item.img };
        }

        async function ensureDetailData() {
            if (detailData) return detailData;
            if (!detailDataPromise) {
                detailDataPromise = fetch('evaluation_data.json?v=1.2.3')
                    .then(res => res.json())
                    .then(full => {
                        detailData = full.map(normalizeImagePath);
                        return detailData;
                    });
            }
            return detailDataPromise;
        }

        async function getItemById(id) {
            const lite = data.find(x => x.id === id);
            if (lite && lite.yaml && lite.comments && lite.scores) {
                return lite;
            }
            const full = await ensureDetailData();
            return full.find(x => x.id === id) || lite || null;
        }

        // Load style ranking AND main data in parallel, render only when both settle
        const rankingPromise = fetch('../style-ranking.json?v=' + Date.now())
            .then(res => res.ok ? res.json() : null)
            .catch(() => null);

        const dataPromise = fetch('evaluation_lite.json?v=1.0.0')
            .then(res => res.json());

        const businessPromise = fetch('business_prompts.json?v=' + Date.now())
            .then(res => res.ok ? res.json() : [])
            .catch(() => []);

        Promise.all([rankingPromise, dataPromise, businessPromise])
            .then(([ranking, d, businessData]) => {
                styleRanking = ranking;
                // Normalize relative image paths to absolute URLs (for BananaNL export compat)
                function toAbsUrl(path) {
                    if (!path || /^(https?:|data:|blob:)/i.test(path)) return path;
                    var base = window.location.href.replace(/\/(en|ko|zh)\//, '/'); return new URL(path, base).href;
                }
                // Add Business tag and number to business items (302+)
                (businessData || []).forEach((item, i) => {
                    item.tags = ['Business'];
                    item.number = 302 + i;
                    item.total = 0; // No score for business items
                    item.scores = {}; // Empty scores object
                    item.img = toAbsUrl(item.img);
                    // Use Korean category name
                    // Keep category as-is (Japanese key) for BIZ_CATEGORIES filter matching
                    item.name = item.name_ko || item.name || '';
                });
                // Merge: existing 301 items first, then business items
                const normalizedBusiness = businessData.map(normalizeImagePath);
                data = [...d.map(normalizeImagePath), ...normalizedBusiness];
                // Add tags by parsing style name (only for existing items without tags)
                data.forEach(item => {
                    if (!item.tags || !item.tags.length) {
                        item.tags = item.name ? item.name.split(' / ').map(t => t.trim()) : [];
                    }
                });
                // If default sort is popular but ranking failed, fall back to score_desc
                if (!styleRanking || !styleRanking.order) {
                    const sortInput = document.getElementById('sort');
                    if (sortInput && sortInput.value === 'popular') {
                        sortInput.value = 'score_desc';
                        const selected = document.querySelector('#custom-sort-wrapper .select-selected');
                        if (selected) selected.textContent = 'Score';
                    }
                }
                personalizeRecommendations();
                initTabs();
                renderGallery();
                safeLucideCreate();
                // Check for direct link via URL parameter
                const urlParams = new URLSearchParams(window.location.search);
                const tabParam = urlParams.get('tab');
                if (tabParam) {
                    goToTag(tabParam);
                }
                const directId = urlParams.get('id');
                if (directId) {
                    const item = data.find(x => x.id === directId);
                    if (item) {
                        openM(directId);
                    } else {
                        showToast('見つかりませんでした');
                    }
                }
            })
            .catch(e => {
                console.error('Data load failed', e);
                showToast('データの読み込みに失敗しました');
                showDataError();
            });
        const JP = {
            "Legibility": "可読性", "Hierarchy": "階層構造", "Consistency": "一貫性", "Atmosphere": "雰囲気", "Theme Fit": "テーマ適合性"
        };
        let chart = null;
        function safeLucideCreate(options) {
            if (window.lucide && typeof lucide.createIcons === 'function') {
                lucide.createIcons(options);
            }
        }

        const KEY_FAVS = 'bx_favs';
        const KEY_HISTORY = 'bx_history'; // New key for history array
        const KEY_USER_MODE = 'bx_user_mode'; // New key for user mode
        const KEY_LAST_COPY_OLD = 'bx_last_copy'; // Old key for migration
        const KEY_VIEW_MODE = 'bx_view_mode'; // View mode: 'grid' or 'list'


        // --- Group Toggle (まとめる) Logic ---
        const KEY_GROUP_MODE = 'viewMode'; // "tile" (grouped/overview) or "list" (flat)
        function getGroupMode() {
            return localStorage.getItem(KEY_GROUP_MODE) || 'tile';
        }
        function handleGroupToggle(checked) {
            const mode = checked ? 'tile' : 'list';
            localStorage.setItem(KEY_GROUP_MODE, mode);

            // GA4 Event
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'view_mode_change',
                'site': 'evaluation',
                'mode': mode
            });

            // Update view
            if (activeTag === 'ALL' && !searchQuery) {
                viewMode = checked ? 'overview' : 'masonry';
                renderGallery();
            }
        }
        function updateGroupToggleVisibility() {
            const wrap = document.getElementById('groupToggleWrap');
            if (!wrap) return;
            // Show only when ALL tab is active and no search
            wrap.style.display = (activeTag === 'ALL' && !searchQuery) ? 'flex' : 'none';
        }
        function restoreGroupToggle() {
            const toggle = document.getElementById('groupToggle');
            if (!toggle) return;
            const mode = getGroupMode();
            toggle.checked = (mode === 'tile');
        }

        // --- View Mode Logic ---
        function getViewModeDisplay() {
            return localStorage.getItem(KEY_VIEW_MODE) || 'grid';
        }
        (function applyInitialViewModeClass() {
            const viewMode = getViewModeDisplay();
            const grid = document.getElementById('grid');
            if (grid) {
                grid.classList.remove('grid-mode', 'list-mode');
                grid.classList.add(viewMode + '-mode');
            }
        })();
        function setViewModeUI(mode) {
            localStorage.setItem(KEY_VIEW_MODE, mode);

            // Update button styles
            const gridBtn = document.getElementById('viewModeGrid');
            const listBtn = document.getElementById('viewModeList');
            if (gridBtn && listBtn) {
                if (mode === 'grid') {
                    gridBtn.style.background = '#fff';
                    gridBtn.style.color = 'var(--accent)';
                    gridBtn.style.fontWeight = '700';
                    listBtn.style.background = 'transparent';
                    listBtn.style.color = 'var(--text-main)';
                    listBtn.style.fontWeight = '500';
                } else {
                    listBtn.style.background = '#fff';
                    listBtn.style.color = 'var(--accent)';
                    listBtn.style.fontWeight = '700';
                    gridBtn.style.background = 'transparent';
                    gridBtn.style.color = 'var(--text-main)';
                    gridBtn.style.fontWeight = '500';
                }
            }

            // Update grid CSS class
            const grid = document.getElementById('grid');
            if (grid) {
                grid.classList.remove('grid-mode', 'list-mode');
                grid.classList.add(mode + '-mode');
            }

            // GA4 Event
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'view_mode_change',
                'site': 'evaluation',
                'mode': mode
            });

            safeLucideCreate();
        }

        // --- User Mode Logic ---
        function getUserMode() {
            return localStorage.getItem(KEY_USER_MODE) || 'normal';
        }
        function setUserMode(mode) {
            localStorage.setItem(KEY_USER_MODE, mode);

            // Trim favorites and history when switching to normal mode
            const favMax = mode === 'pro' ? 12 : 3;
            const histMax = mode === 'pro' ? 4 : 1;

            let favs = getFavs();
            if (favs.length > favMax) {
                favs = favs.slice(0, favMax);
                setFavs(favs);
            }

            let hist = getHistory();
            if (hist.length > histMax) {
                hist = hist.slice(0, histMax);
                setHistory(hist);
            }

            // GA4 Event: switch_user_mode
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'switch_user_mode',
                'site': 'evaluation',
                'mode_label': mode
            });
            render();
            if (typeof updateSpecialTabCounts === 'function') {
                updateSpecialTabCounts();
            }
            if (typeof renderGallery === 'function') {
                renderGallery();
            }
        }

        // --- History Logic (with Migration) ---
        function getHistory() {
            // Migration check
            const old = localStorage.getItem(KEY_LAST_COPY_OLD);
            let hist = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
            if (old) {
                // Migrate old value to history if not present
                if (!hist.includes(old)) {
                    hist.unshift(old);
                }
                localStorage.removeItem(KEY_LAST_COPY_OLD);
                setHistory(hist);
            }
            return hist;
        }
        function setHistory(hist) {
            localStorage.setItem(KEY_HISTORY, JSON.stringify(hist));
            if (typeof updateSpecialTabCounts === 'function') updateSpecialTabCounts();
        }
        function addToHistory(id) {
            let hist = getHistory();
            // Remove existing to move to front
            hist = hist.filter(x => x !== id);
            hist.unshift(id);
            // Limit is handled in render time or we can limit here to a safe max (e.g. 50)
            if (hist.length > 50) hist = hist.slice(0, 50);
            setHistory(hist);
        }

        function getFavs() { return JSON.parse(localStorage.getItem(KEY_FAVS) || '[]'); }
        function setFavs(favs) {
            localStorage.setItem(KEY_FAVS, JSON.stringify(favs));
            if (typeof updateSpecialTabCounts === 'function') updateSpecialTabCounts();
        }

        
        function emitFavoriteCtaImpression(item) {
            if (!item) return;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'favorite_cta_impression',
                'site': 'evaluation',
                'item_id': item.id,
                'item_name': item.name,
                'user_mode': getUserMode(),
                'source': 'modal'
            });
        }

        function showFavoriteNudge(item, sourceEvent) {
            if (!item || !item.id) return;
            const favs = getFavs();
            if (favs.includes(item.id)) return;

            const locale = (window.location.pathname.includes('/en/') && 'en') ||
                (window.location.pathname.includes('/ko/') && 'ko') ||
                (window.location.pathname.includes('/zh/') && 'zh') || 'ja';

            const labels = {
                ja: { msg: 'このスタイルをお気に入りに保存しますか？', save: '保存する', later: 'あとで' },
                en: { msg: 'Save this style to favorites for later?', save: 'Save', later: 'Later' },
                ko: { msg: '이 스타일을 즐겨찾기에 저장할까요?', save: '저장', later: '나중에' },
                zh: { msg: '要将这个风格加入收藏吗？', save: '收藏', later: '稍后' }
            }[locale];

            const old = document.getElementById('favorite-nudge');
            if (old) old.remove();

            const box = document.createElement('div');
            box.id = 'favorite-nudge';
            box.style.position = 'fixed';
            box.style.left = '16px';
            box.style.bottom = '16px';
            box.style.zIndex = '2147483647';
            box.style.background = '#fff';
            box.style.border = '1px solid #e5e7eb';
            box.style.borderRadius = '12px';
            box.style.boxShadow = '0 8px 20px rgba(0,0,0,0.12)';
            box.style.padding = '10px 12px';
            box.style.maxWidth = '320px';
            box.innerHTML = '<div style="font-size:12px;color:#111;margin-bottom:8px;line-height:1.5;">' + labels.msg + '</div>' +
                '<div style="display:flex;gap:8px;">' +
                '<button id="favorite-nudge-save" style="border:1px solid var(--accent);background:var(--accent);color:#fff;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">' + labels.save + '</button>' +
                '<button id="favorite-nudge-later" style="border:1px solid #d1d5db;background:#fff;color:#111;border-radius:8px;padding:6px 10px;font-size:12px;cursor:pointer;">' + labels.later + '</button>' +
                '</div>';
            document.body.appendChild(box);

            const removeNudge = () => {
                const n = document.getElementById('favorite-nudge');
                if (n) n.remove();
            };

            document.getElementById('favorite-nudge-save').addEventListener('click', () => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'favorite_nudge_click',
                    'site': 'evaluation',
                    'item_id': item.id,
                    'item_name': item.name,
                    'source': sourceEvent,
                    'action': 'save',
                    'user_mode': getUserMode()
                });
                toggleFav(item.id, null, sourceEvent === 'copy_prompt' ? 'modal' : 'list');
                removeNudge();
            });

            document.getElementById('favorite-nudge-later').addEventListener('click', () => {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({
                    'event': 'favorite_nudge_click',
                    'site': 'evaluation',
                    'item_id': item.id,
                    'item_name': item.name,
                    'source': sourceEvent,
                    'action': 'later',
                    'user_mode': getUserMode()
                });
                removeNudge();
            });

            setTimeout(removeNudge, 8000);
        }

        function toggleFav(id, event, sourceHint) {
            if (event) event.stopPropagation();
            let favs = getFavs();
            const mode = getUserMode();
            const limit = mode === 'pro' ? 12 : 3;
            const source = sourceHint || ((event && event.currentTarget && event.currentTarget.id === 'm-fav-btn') ? 'modal' : 'list');
            const clickedItem = data.find(d => d.id === id);
            const wasFavorited = favs.includes(id);

            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'favorite_cta_click',
                'site': 'evaluation',
                'item_id': clickedItem ? clickedItem.id : id,
                'item_name': clickedItem ? clickedItem.name : '',
                'user_mode': mode,
                'source': source,
                'action': wasFavorited ? 'remove' : 'add'
            });

            if (favs.includes(id)) {
                favs = favs.filter(x => x !== id);
                showToast('즐겨찾기에서 삭제되었습니다');
            } else {
                favs.unshift(id);
                // Track action for badge system
                if (typeof incrementAction === 'function') incrementAction('fav_add');
                if (favs.length > limit) {
                    if (mode === 'normal') {
                        window.dataLayer = window.dataLayer || [];
                        window.dataLayer.push({ 'event': 'favorite_limit_reached', 'mode': 'normal', 'site': 'evaluation' });
                        showToast('Proモードなら12件まで保存できます', 'special-share');
                    } else {
                        showToast('保存上限(12件)のため最も古い項目が削除されました', 'special-share');
                    }
                    favs = favs.slice(0, limit);
                } else {
                    showToast('즐겨찾기에 추가되었습니다');
                }

                const item = data.find(d => d.id === id);
                if (item) {
                    window.dataLayer = window.dataLayer || [];
                    window.dataLayer.push({
                        'event': 'favorite_register',
                        'site': 'evaluation',
                        'item_id': item.id,
                        'item_name': item.name
                    });
                }
            }
            setFavs(favs);

            // Update Modal Button if open
            const modalFavBtn = document.getElementById('m-fav-btn');
            if (modalFavBtn && typeof window.currentItemId !== 'undefined' && window.currentItemId === id) {
                if (favs.includes(id)) {
                    modalFavBtn.classList.add('active');
                    modalFavBtn.style.color = 'var(--accent)';
                    modalFavBtn.style.borderColor = 'var(--accent)';
                    modalFavBtn.style.background = '#fff';
                    modalFavBtn.innerHTML = '<i data-lucide="heart" style="width:12px;height:12px;fill:currentColor;"></i><span class="action-btn__label"> 저장됨</span>';
                } else {
                    modalFavBtn.classList.remove('active');
                    modalFavBtn.style.color = '';
                    modalFavBtn.style.borderColor = '';
                    modalFavBtn.style.background = '';
                    modalFavBtn.innerHTML = '<i data-lucide="heart" style="width:12px;height:12px;"></i><span class="action-btn__label"> 즐겨찾기</span>';
                }
                safeLucideCreate();
            }

            // Update both masonry and overview views
            if (typeof renderGallery === 'function') {
                renderGallery();
            } else {
                render();
            }
        }

        let recommendations = window.recommendations || [];

        // Personalized recommendations based on browsing history
        // Called after data is loaded (inside Promise.all.then)
        // Personalized recommendations based on browsing history
        function getPersonalizedRecommendations() {
            const hist = JSON.parse(localStorage.getItem('bx_history') || '[]');
            if (hist.length < 3) return null; // Not enough data, use defaults

            // Count tag frequency from viewed items
            const tagFreq = {};
            hist.forEach(id => {
                const item = data.find(d => d.id === id);
                if (item && item.tags) {
                    item.tags.forEach(tag => {
                        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
                    });
                }
            });

            // Score all unviewed items by matching tags
            const histSet = new Set(hist);
            const favSet = new Set(JSON.parse(localStorage.getItem('bx_fav') || '[]'));
            const scored = data
                .filter(d => d.id && !histSet.has(d.id) && !favSet.has(d.id)) // Exclude already seen & favorited
                .map(d => {
                    let score = 0;
                    if (d.tags) d.tags.forEach(t => { score += (tagFreq[t] || 0); });
                    // Add small random factor to avoid always the same order
                    score += Math.random() * 0.5;
                    return { id: d.id, score };
                })
                .filter(d => d.score > 0)
                .sort((a, b) => b.score - a.score)
                .slice(0, 30);

            return scored.length >= 3 ? scored.map(s => s.id) : null;
        }

        function personalizeRecommendations() {
            const personalized = getPersonalizedRecommendations();
            if (personalized) {
                recommendations = personalized;
                window.personalized = true;
            }
        }

        // Initial Render
        render();

        /* Custom Dropdown Logic */
        function closeAllSelect(elmnt) {
            var x, y, i, xl, yl, arrNo = [];
            x = document.getElementsByClassName("select-items");
            y = document.getElementsByClassName("select-selected");
            xl = x.length;
            yl = y.length;
            for (i = 0; i < yl; i++) {
                if (elmnt == y[i]) {
                    arrNo.push(i)
                } else {
                    y[i].classList.remove("select-arrow-active");
                }
            }
            for (i = 0; i < xl; i++) {
                if (arrNo.indexOf(i)) {
                    x[i].classList.add("select-hide");
                }
            }
        }
        document.addEventListener('DOMContentLoaded', function () {
            const wrapper = document.getElementById('custom-sort-wrapper');
            if (!wrapper) return; // Safety guard
            const hiddenInput = document.getElementById('sort');
            const selected = wrapper.querySelector('.select-selected');
            const items = wrapper.querySelector('.select-items');
            const options = items.querySelectorAll('div');

            // Toggle dropdown
            selected.addEventListener('click', function (e) {
                e.stopPropagation();
                closeAllSelect(this);
                items.classList.toggle('select-hide');
                selected.classList.toggle('select-arrow-active');
            });

            // Option click
            options.forEach(option => {
                option.addEventListener('click', function (e) {
                    e.stopPropagation();
                    // Update text
                    selected.textContent = this.textContent;
                    // Update hidden value
                    hiddenInput.value = this.getAttribute('data-value');
                    // Look active style
                    options.forEach(o => o.style.fontWeight = 'normal');
                    this.style.fontWeight = 'bold';

                    // Close and Render
                    items.classList.add('select-hide');
                    selected.classList.remove('select-arrow-active');
                    render();
                });
            });

            // Close when clicking outside
            document.addEventListener('click', function (e) {
                closeAllSelect(null);
            });

            // Custom Dropdown Logic END

            // Mode Switch Animation
            const toggle = document.getElementById('userModeToggle');
            if (toggle) {
                // We need to find the specific slider/knob relative to the toggle to support potentially multiple switches (though here is ID based)
                // But let's stick to simple ID query or relative query if possible. 
                // Since we replaced the HTML structure, we can find .slider and .knob
                const slider = document.querySelector('.slider');
                const knob = document.querySelector('.knob');

                // Safety guard for slider/knob
                if (slider && knob) {
                    const currentMode = localStorage.getItem('bx_user_mode') || 'normal';
                    if (currentMode === 'pro') {
                        gsap.set(knob, { x: 20 });
                        gsap.set(slider, { backgroundColor: '#E55039' });
                    } else {
                        gsap.set(knob, { x: 0 });
                        gsap.set(slider, { backgroundColor: '#ccc' });
                    }

                    // Watch for changes
                    toggle.addEventListener('change', function () {
                        if (this.checked) {
                            gsap.to(knob, { x: 20, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
                            gsap.to(slider, { backgroundColor: '#E55039', duration: 0.3 });
                        } else {
                            gsap.to(knob, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
                            gsap.to(slider, { backgroundColor: '#ccc', duration: 0.3 });
                        }
                    });
                }
            }
        });

        // Initialize
        window.onload = function () {
            const mode = getUserMode();
            const toggle = document.getElementById('userModeToggle');
            if (toggle) toggle.checked = (mode === 'pro');

            // Initialize view mode
            const viewMode = getViewModeDisplay();
            // Update button styles
            const gridBtn = document.getElementById('viewModeGrid');
            const listBtn = document.getElementById('viewModeList');
            if (gridBtn && listBtn) {
                if (viewMode === 'grid') {
                    gridBtn.style.background = '#fff';
                    gridBtn.style.color = 'var(--accent)';
                    gridBtn.style.fontWeight = '700';
                } else {
                    listBtn.style.background = '#fff';
                    listBtn.style.color = 'var(--accent)';
                    listBtn.style.fontWeight = '700';
                }
            }

            safeLucideCreate();
            restoreGroupToggle();
            // The render() call here is now redundant as it's called after data fetch and before DOMContentLoaded.
            // Keeping it for now as per instruction to faithfully apply the change, but it might be removed in a future edit.
            render();

            // Pro Mode Promo Arrow: Show for 3 seconds if Normal mode
            const promoArrow = document.getElementById('proPromoArrow');
            if (promoArrow && mode === 'normal') {
                setTimeout(() => {
                    promoArrow.classList.add('show');
                }, 300);
                setTimeout(() => {
                    promoArrow.classList.remove('show');
                }, 3300);

                // Add click handler to scroll to Pro mode toggle
                promoArrow.style.cursor = 'pointer';
                promoArrow.onclick = () => {
                    const toggle = document.getElementById('userModeToggle');
                    if (toggle) {
                        toggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Highlight toggle briefly
                        const parent = toggle.closest('.mode-toggle-inline');
                        if (parent) {
                            parent.style.outline = '2px solid var(--accent)';
                            parent.style.borderRadius = '8px';
                            setTimeout(() => {
                                parent.style.outline = '';
                            }, 2000);
                        }
                    }
                };
            }

            // Initialize badge system
            if (typeof initBadgeSystem === 'function') {
                initBadgeSystem();
            }

            // Scroll tracking for badge system
            let scrollExploreTriggered = false;
            window.addEventListener('scroll', () => {
                const scrollPercent = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
                if (scrollPercent > 0.8 && !scrollExploreTriggered) {
                    scrollExploreTriggered = true;
                    if (typeof incrementAction === 'function') {
                        incrementAction('scroll_explore');
                    }
                    // Reset after some time to allow re-triggering
                    setTimeout(() => { scrollExploreTriggered = false; }, 30000);
                }
            }, { passive: true });
        };

        function createPinBadge(type) {
            const pin = document.createElement('div');
            let iconName = '';
            let label = '';
            let className = '';
            let filled = false;
            if (type === 'history') {
                iconName = 'zap';
                label = '마지막 복사';
                if (getUserMode() === 'pro') label = '기록';
                className = 'zap';
            } else if (type === 'favorite') {
                iconName = 'heart';
                label = '즐겨찾기';
                className = 'heart';
                filled = true;
            } else if (type === 'feature') {
                iconName = 'crown';
                label = '注目';
                className = 'feature';
                filled = true;
            } else if (type === 'recommendation') {
                iconName = 'star';
                label = '추천';
                className = 'recommend';
                filled = true;
            } else {
                return null;
            }

            pin.className = `pin-badge ${className}`;

            if (type === 'feature') {
                const emoji = document.createElement('span');
                emoji.textContent = '👑';
                emoji.style.marginRight = '4px';
                emoji.style.fontSize = '12px';
                pin.appendChild(emoji);
            } else {
                const icon = document.createElement('i');
                icon.setAttribute('data-lucide', iconName);
                icon.style.width = '12px';
                icon.style.height = '12px';
                if (filled) icon.style.fill = 'currentColor';
                pin.appendChild(icon);
            }

            pin.appendChild(document.createTextNode(label));
            return pin;
        }

        function renderYaml(container, yamlText) {
            const fragment = document.createDocumentFragment();
            const lines = String(yamlText || '').split(/\r?\n/);
            lines.forEach((line, idx) => {
                const match = line.match(/^([a-zA-Z0-9_-]+):(.*)$/);
                if (match) {
                    const key = document.createElement('span');
                    key.className = 'key';
                    key.textContent = `${match[1]}:`;
                    fragment.appendChild(key);
                    fragment.appendChild(document.createTextNode(match[2] || ''));
                } else {
                    fragment.appendChild(document.createTextNode(line));
                }
                if (idx < lines.length - 1) fragment.appendChild(document.createTextNode('\n'));
            });
            container.replaceChildren(fragment);
        }

        function renderScoreGrid(container, scores) {
            const fragment = document.createDocumentFragment();
            Object.keys(scores || {}).forEach(k => {
                const item = document.createElement('div');
                item.className = 'sg-item';
                const label = document.createElement('span');
                label.className = 'sg-label';
                label.textContent = JP[k] || k;
                const value = document.createElement('span');
                value.className = 'sg-val';
                value.textContent = scores[k];
                item.appendChild(label);
                item.appendChild(value);
                fragment.appendChild(item);
            });
            container.replaceChildren(fragment);
        }

        function renderComments(container, scores, comments) {
            const fragment = document.createDocumentFragment();
            Object.keys(comments || {}).forEach(k => {
                const item = document.createElement('div');
                item.className = 'comment-item';
                const header = document.createElement('div');
                header.className = 'comment-header';
                const label = document.createElement('span');
                label.className = 'comment-label';
                label.textContent = JP[k] || k;
                const score = document.createElement('span');
                score.className = 'comment-score';
                score.textContent = `${scores[k]}/10`;
                header.appendChild(label);
                header.appendChild(score);
                const text = document.createElement('p');
                text.className = 'comment-text';
                text.textContent = comments[k];
                item.appendChild(header);
                item.appendChild(text);
                fragment.appendChild(item);
            });
            container.replaceChildren(fragment);
        }

        function showDataError() {
            const grid = document.getElementById('grid');
            const error = document.createElement('div');
            error.className = 'empty-state';
            error.textContent = 'データの読み込みに失敗しました。ページを再読み込みしてください。';
            grid.replaceChildren(error);
        }

        // === App Library Functions ===
        function initTabs() {
            const tagCounts = {};
            data.forEach(item => {
                item.tags.forEach(t => {
                    tagCounts[t] = (tagCounts[t] || 0) + 1;
                });
            });

            const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);

            // ALL Tab
            const allBtn = createTabBtn('ALL', null, true);
            allBtn.classList.add('sticky-tab');
            tabArea.appendChild(allBtn);

            // Favorites Tab
            const favs = JSON.parse(localStorage.getItem(KEY_FAVS) || '[]');
            const mode = getUserMode();
            const favMax = mode === 'pro' ? 12 : 3;
            const histMax = mode === 'pro' ? 4 : 1;
            const favBtn = createTabBtn('⭐ 즐겨찾기', `${favs.length}/${favMax}`, false, 'favorites');
            favBtn.style.color = '#F57C00';
            tabArea.appendChild(favBtn);

            // History Tab
            const history = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
            const histBtn = createTabBtn('🕐 기록', `${Math.min(history.length, histMax)}/${histMax}`, false, 'history');
            histBtn.style.color = '#1976D2';
            tabArea.appendChild(histBtn);

            // Recommendations Tab
            const recBtn = createTabBtn('✨ 추천', recommendations.length, false, 'recommendations');
            recBtn.style.color = '#388E3C';
            tabArea.appendChild(recBtn);

            // Business Tab (Fixed)
            if (tagCounts['Business']) {
                const bizBtn = createTabBtn('💼 비즈니스', tagCounts['Business'], false, 'Business');
                bizBtn.style.color = '#607D8B';
                tabArea.appendChild(bizBtn);
            }

            sortedTags.forEach(tag => {
                if (tag === 'Business') return;
                tabArea.appendChild(createTabBtn(tag, tagCounts[tag], false));
            });

            // Scroll arrows (with 300ms debounce to prevent rage clicks)
            let scrollDebounce = false;
            document.getElementById('scrollLeft').addEventListener('click', () => {
                if (scrollDebounce) return;
                scrollDebounce = true;
                tabArea.scrollBy({ left: -150, behavior: 'smooth' });
                setTimeout(() => { scrollDebounce = false; }, 300);
            });
            document.getElementById('scrollRight').addEventListener('click', () => {
                if (scrollDebounce) return;
                scrollDebounce = true;
                tabArea.scrollBy({ left: 150, behavior: 'smooth' });
                setTimeout(() => { scrollDebounce = false; }, 300);
            });
            tabArea.addEventListener('scroll', updateScrollArrows);
            setTimeout(updateScrollArrows, 0);
        }

        // Update tab counts (call after fav/history changes)
        function updateSpecialTabCounts() {
            const favs = JSON.parse(localStorage.getItem(KEY_FAVS) || '[]');
            const history = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
            const mode = getUserMode();
            const favMax = mode === 'pro' ? 12 : 3;
            const histMax = mode === 'pro' ? 4 : 1;

            const tabs = tabArea.querySelectorAll('.tab-btn');
            tabs.forEach(tab => {
                if (tab.dataset.special === 'favorites') {
                    tab.innerHTML = `⭐ 즐겨찾기 <span style="font-size:11px; opacity:0.5;">(${favs.length}/${favMax})</span>`;
                } else if (tab.dataset.special === 'history') {
                    tab.innerHTML = `🕐 기록 <span style="font-size:11px; opacity:0.5;">(${Math.min(history.length, histMax)}/${histMax})</span>`;
                }
            });
        }

        function createTabBtn(label, count, isActive, special = null) {
            const btn = document.createElement('button');
            btn.className = `tab-btn ${isActive ? 'active' : ''}`;
            if (special) btn.dataset.special = special;
            btn.dataset.tag = special || label;

            if (count !== null && count !== undefined) {
                btn.innerHTML = `${label} <span style="font-size:11px; opacity:0.5;">(${count})</span>`;
            } else {
                btn.innerHTML = label;
            }

            btn.onclick = () => {
                Array.from(tabArea.children).forEach(c => c.classList.remove('active'));
                btn.classList.add('active');
                activeTag = special || label;
                if (activeTag !== 'Business') bizSubFilter = 'all';

                // Track tab change
                window.dataLayer.push({
                    'event': 'tab_change',
                    'site': 'evaluation',
                    'tab_name': special || label,
                    'tab_type': special ? 'special' : (label === 'ALL' ? 'all' : 'category')
                });

                // Only ALL shows overview; others (including favorites/history) show masonry
                if (label === 'ALL' && !searchQuery) {
                    viewMode = (getGroupMode() === 'tile') ? 'overview' : 'masonry';
                } else {
                    viewMode = 'masonry';
                }

                // Update URL with selected tab (keep lang, remove modal id)
                const newUrl = new URL(window.location);
                const selectedTag = special || label;
                if (selectedTag === 'ALL') {
                    newUrl.searchParams.delete('tab');
                } else {
                    newUrl.searchParams.set('tab', selectedTag);
                }
                newUrl.searchParams.delete('id');
                history.pushState({ tab: selectedTag }, '', newUrl);

                renderGallery();
                updateGroupToggleVisibility();
            };
            return btn;
        }

        function updateScrollArrows() {
            const leftArrow = document.getElementById('scrollLeft');
            const rightArrow = document.getElementById('scrollRight');

            if (tabArea.scrollLeft > 10) {
                leftArrow.classList.add('visible');
                leftArrow.style.visibility = 'visible';
            } else {
                leftArrow.classList.remove('visible');
                leftArrow.style.visibility = 'hidden';
            }

            if (tabArea.scrollLeft < tabArea.scrollWidth - tabArea.clientWidth - 2) {
                rightArrow.classList.add('visible');
                rightArrow.style.visibility = 'visible';
            } else {
                rightArrow.classList.remove('visible');
                rightArrow.style.visibility = 'hidden';
            }
        }

        // Business sub-filter state
        let bizSubFilter = 'all';
        const BIZ_CATEGORIES = [
            { key: 'all', label: '전체', emoji: '' },
            { key: '業種', label: '업종', emoji: '🏢' },
            { key: 'シーン', label: '씬', emoji: '📋' },
            { key: 'スタイル', label: '스타일', emoji: '🎨' },
            { key: 'テイスト', label: '테이스트', emoji: '🖼️' }
        ];

        function renderBizSubFilters() {
            let bar = document.getElementById('biz-sub-filter-bar');
            if (activeTag !== 'Business') {
                if (bar) bar.style.display = 'none';
                return;
            }
            if (!bar) {
                bar = document.createElement('div');
                bar.id = 'biz-sub-filter-bar';
                bar.style.cssText = 'display:flex;gap:8px;padding:8px 0 12px;flex-wrap:wrap;';
                const grid = document.getElementById('grid');
                grid.parentNode.insertBefore(bar, grid);
            }
            bar.style.display = 'flex';
            bar.innerHTML = '';
            BIZ_CATEGORIES.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'biz-sub-btn' + (bizSubFilter === cat.key ? ' active' : '');
                const count = cat.key === 'all'
                    ? data.filter(d => d.id && d.id.startsWith('biz_')).length
                    : data.filter(d => d.id && d.id.startsWith('biz_') && d.category === cat.key).length;
                btn.innerHTML = cat.emoji + ' ' + cat.label + ' <span style="font-size:11px;opacity:0.5;">(' + count + ')</span>';
                btn.onclick = () => {
                    bizSubFilter = cat.key;
                    renderGallery();
                };
                bar.appendChild(btn);
            });
        }

        function renderGallery() {
            updateGroupToggleVisibility();
            renderBizSubFilters();
            if (viewMode === 'overview') {
                renderOverview();
            } else {
                libraryContainer.classList.add('view-hidden');
                galleryContainer.classList.remove('view-hidden');
                render(); // Use existing render function
            }
        }

        function renderOverview() {
            libraryContainer.classList.remove('view-hidden');
            galleryContainer.classList.add('view-hidden');
            libraryContainer.innerHTML = '';
            tipIndex = 0; // Reset tip index for each render

            // Helper function to create a special folder (favorites/history/recommendations)
            function createSpecialFolder(type) {
                const mode = getUserMode();
                const favMax = mode === 'pro' ? 12 : 3;
                const histMax = mode === 'pro' ? 4 : 1;

                let ids;
                if (type === 'favorites') ids = getFavs().slice(0, favMax);
                else if (type === 'history') ids = getHistory().slice(0, histMax);
                else if (type === 'recommendations') ids = recommendations || [];
                else ids = [];

                const items = ids.map(id => data.find(d => d.id === id)).filter(Boolean);

                // Calculate tip index: tips disappear from the beginning as items are added
                // favorites uses tips 0-3, history uses tips 4-7
                const baseOffset = type === 'favorites' ? 0 : type === 'history' ? 4 : 0;
                const filledSlots = Math.min(items.length, 3);
                let localTipIndex = baseOffset + filledSlots;

                // Show folder even if empty (to display tips)

                const folder = document.createElement('div');
                folder.className = 'library-folder';

                const grid = document.createElement('div');
                grid.className = 'folder-grid';
                // Add subtle background color for special folders
                if (type === 'favorites') {
                    grid.style.background = 'linear-gradient(135deg, #FFF8E1 0%, #FFECB3 100%)';
                } else if (type === 'history') {
                    grid.style.background = 'linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%)';
                } else if (type === 'recommendations') {
                    grid.style.background = 'linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%)';
                }

                const goToList = (e) => {
                    e && e.stopPropagation();
                    // Track special folder click
                    window.dataLayer.push({
                        'event': 'folder_click',
                        'site': 'evaluation',
                        'folder_name': type,
                        'folder_type': 'special',
                        'item_count': items.length
                    });
                    activeTag = type;
                    viewMode = 'masonry';
                    updateTabsUI(type);
                    renderGallery();
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };

                // Add click handler to entire grid
                grid.onclick = goToList;

                for (let i = 0; i < 4; i++) {
                    const slot = document.createElement('div');
                    slot.className = 'folder-item';

                    if (i < 3) {
                        if (items[i]) {
                            const img = document.createElement('img');
                            img.src = items[i].img;
                            img.loading = 'lazy';
                            img.decoding = 'async';
                            img.fetchPriority = 'low';
                            img.width = 400;
                            img.height = 400;
                            slot.appendChild(img);
                            slot.style.cursor = 'pointer';

                            // Hover overlay
                            const overlay = document.createElement('div');
                            overlay.className = 'folder-item-overlay';
                            slot.appendChild(overlay);

                            // Fav button (top-right)
                            const isFav = getFavs().includes(items[i].id);
                            const favBtn = document.createElement('button');
                            favBtn.className = 'folder-circle-btn fav' + (isFav ? ' active' : '');
                            const favIcon = document.createElement('i');
                            favIcon.setAttribute('data-lucide', 'heart');
                            favIcon.style.width = '16px';
                            favIcon.style.height = '16px';
                            if (isFav) favIcon.style.fill = 'currentColor';
                            favBtn.appendChild(favIcon);
                            favBtn.onclick = (e) => {
                                e.stopPropagation();
                                toggleFav(items[i].id, e);
                            };
                            slot.appendChild(favBtn);

                            // Copy button (bottom-left)
                            const copyBtn = document.createElement('button');
                            copyBtn.className = 'folder-circle-btn copy';
                            const copyIcon = document.createElement('i');
                            copyIcon.setAttribute('data-lucide', 'copy');
                            copyIcon.style.width = '16px';
                            copyIcon.style.height = '16px';
                            copyBtn.appendChild(copyIcon);
                            copyBtn.onclick = (e) => {
                                e.stopPropagation();
                                copyCardPrompt(items[i], copyBtn);
                            };
                            slot.appendChild(copyBtn);

                            // Detail button (bottom-right)
                            const detailBtn = document.createElement('button');
                            detailBtn.className = 'folder-detail-btn';
                            detailBtn.innerHTML = '상세보기 <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>';
                            detailBtn.onclick = (e) => {
                                e.stopPropagation();
                                openM(items[i].id);
                            };
                            slot.appendChild(detailBtn);

                            // Click on image opens modal
                            slot.onclick = (e) => {
                                if (e.target === img || e.target === overlay) {
                                    openM(items[i].id);
                                }
                            };
                        } else {
                            // Show beginner tip in empty slot
                            const tip = beginnerTips[localTipIndex % beginnerTips.length];
                            localTipIndex++;
                            slot.style.background = '#fff';
                            slot.style.display = 'flex';
                            slot.style.flexDirection = 'column';
                            slot.style.justifyContent = 'center';
                            slot.style.alignItems = 'center';
                            slot.style.padding = '8px';
                            slot.style.textAlign = 'center';
                            slot.style.cursor = 'default';
                            slot.innerHTML = `
                                <div style="font-size:9px; color:#999; margin-bottom:4px;">🍌Banana 팁</div>
                                <div style="font-size:11px; color:#333; line-height:1.6;">
                                    <div>${tip.line1}</div>
                                    <div>${tip.line2}</div>
                                    <div>${tip.line3}</div>
                                </div>
                            `;
                        }
                    } else {
                        // 4th slot: "View all" button
                        const mode = getUserMode();
                        const slotMax = type === 'favorites' ? (mode === 'pro' ? 12 : 3) :
                            type === 'history' ? (mode === 'pro' ? 4 : 1) : 12;
                        const hasContent = items.length > 3;
                        const withinLimit = type === 'recommendations' || slotMax > 3;

                        // Get label for type
                        const typeLabel = type === 'favorites' ? '즐겨찾기' :
                            type === 'history' ? '기록' :
                                type === 'recommendations' ? '추천' : type;

                        if (items.length > 3) {
                            slot.style.background = 'transparent';
                            slot.style.position = 'relative';
                            const miniGrid = document.createElement('div');
                            miniGrid.className = 'folder-mini-grid';
                            for (let j = 3; j < Math.min(items.length, 7); j++) {
                                const mItem = document.createElement('div');
                                mItem.className = 'folder-mini-item';
                                const mImg = document.createElement('img');
                                mImg.src = items[j].img;
                                mImg.loading = 'lazy';
                                mImg.width = 400;
                                mImg.height = 400;
                                mItem.appendChild(mImg);
                                miniGrid.appendChild(mItem);
                            }
                            slot.appendChild(miniGrid);

                            // View all overlay button
                            const viewAllBtn = document.createElement('button');
                            viewAllBtn.className = 'folder-view-all-btn';
                            viewAllBtn.innerHTML = `"${typeLabel}" 전체 보기`;
                            viewAllBtn.onclick = goToList;
                            slot.appendChild(viewAllBtn);
                        } else if (items[3]) {
                            const img = document.createElement('img');
                            img.src = items[3].img;
                            img.loading = 'lazy';
                            img.decoding = 'async';
                            img.fetchPriority = 'low';
                            img.width = 400;
                            img.height = 400;
                            slot.appendChild(img);

                            // View all overlay button
                            const viewAllBtn = document.createElement('button');
                            viewAllBtn.className = 'folder-view-all-btn';
                            viewAllBtn.innerHTML = `"${typeLabel}" 전체 보기`;
                            viewAllBtn.onclick = goToList;
                            slot.appendChild(viewAllBtn);
                        } else {
                            // Empty 4th slot: show tip when 3 items or fewer
                            const tip = beginnerTips[localTipIndex % beginnerTips.length];
                            localTipIndex++;
                            slot.style.background = '#fff';
                            slot.style.display = 'flex';
                            slot.style.flexDirection = 'column';
                            slot.style.justifyContent = 'center';
                            slot.style.alignItems = 'center';
                            slot.style.padding = '8px';
                            slot.style.textAlign = 'center';
                            slot.style.cursor = 'default';
                            slot.innerHTML = `
                                <div style="font-size:9px; color:#999; margin-bottom:4px;">🍌Banana 팁</div>
                                <div style="font-size:11px; color:#333; line-height:1.6;">
                                    <div>${tip.line1}</div>
                                    <div>${tip.line2}</div>
                                    <div>${tip.line3}</div>
                                </div>
                            `;
                        }
                    }
                    grid.appendChild(slot);
                }

                const label = document.createElement('div');
                label.className = 'folder-label';
                const labelMode = getUserMode();
                const labelFavMax = labelMode === 'pro' ? 12 : 3;
                const labelHistMax = labelMode === 'pro' ? 4 : 1;
                if (type === 'favorites') {
                    label.textContent = `⭐ 즐겨찾기 (${items.length}/${labelFavMax})`;
                    label.style.color = '#F57C00';
                } else if (type === 'history') {
                    label.textContent = `🕐 기록 (${items.length}/${labelHistMax})`;
                    label.style.color = '#1976D2';
                } else if (type === 'recommendations') {
                    label.textContent = `✨ 추천 (${items.length})`;
                    label.style.color = '#388E3C';
                }
                label.style.cursor = 'pointer';
                label.style.fontWeight = '800';
                label.onclick = goToList;

                folder.appendChild(grid);
                folder.appendChild(label);

                // Add personalized label if applicable
                if (type === 'recommendations' && window.personalized) {
                    const sub = document.createElement('div');
                    sub.style.cssText = 'font-size:11px; opacity:0.5; margin-top:2px; padding-left:4px;';
                    sub.textContent = '시청 기록 기반';
                    folder.appendChild(sub);
                }

                return folder;
            }

            // Add special folders at the top (only in ALL view)
            if (activeTag === 'ALL') {
                const favFolder = createSpecialFolder('favorites');
                const histFolder = createSpecialFolder('history');
                const recFolder = createSpecialFolder('recommendations');
                if (favFolder) libraryContainer.appendChild(favFolder);
                if (histFolder) libraryContainer.appendChild(histFolder);
                if (recFolder) libraryContainer.appendChild(recFolder);
            }

            // Group by tag (for ALL view)
            const tagGroups = {};
            data.forEach(item => {
                item.tags.forEach(t => {
                    if (!tagGroups[t]) tagGroups[t] = [];
                    tagGroups[t].push(item);
                });
            });

            const allTags = Object.keys(tagGroups).map(tag => ({ tag, items: tagGroups[tag] }));

            // Major (5+ items) -> Folders
            const majorCategories = allTags
                .filter(g => g.items.length >= 5)
                .sort((a, b) => b.items.length - a.items.length);

            // Minor (<5 items) -> Others card
            const minorCategories = allTags
                .filter(g => g.items.length < 5)
                .sort((a, b) => b.items.length - a.items.length);

            // Create folders
            majorCategories.forEach(cat => {
                const folder = document.createElement('div');
                folder.className = 'library-folder';

                const goToList = (e) => {
                    e && e.stopPropagation();
                    // Track category folder click
                    window.dataLayer.push({
                        'event': 'folder_click',
                        'site': 'evaluation',
                        'folder_name': cat.tag,
                        'folder_type': 'category',
                        'item_count': cat.items.length
                    });
                    activeTag = cat.tag;
                    viewMode = 'masonry';
                    updateTabsUI(cat.tag);
                    renderGallery();
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };

                const grid = document.createElement('div');
                grid.className = 'folder-grid';

                // Add click handler to entire grid
                grid.onclick = goToList;

                const items = cat.items;

                for (let i = 0; i < 4; i++) {
                    const slot = document.createElement('div');
                    slot.className = 'folder-item';

                    if (i < 3) {
                        if (items[i]) {
                            const img = document.createElement('img');
                            img.src = items[i].img;
                            img.loading = 'lazy';
                            img.decoding = 'async';
                            img.fetchPriority = 'low';
                            img.width = 400;
                            img.height = 400;
                            slot.appendChild(img);
                            slot.style.cursor = 'pointer';

                            // Hover overlay
                            const overlay = document.createElement('div');
                            overlay.className = 'folder-item-overlay';
                            slot.appendChild(overlay);

                            // Fav button (top-right)
                            const isFav = getFavs().includes(items[i].id);
                            const favBtn = document.createElement('button');
                            favBtn.className = 'folder-circle-btn fav' + (isFav ? ' active' : '');
                            const favIcon = document.createElement('i');
                            favIcon.setAttribute('data-lucide', 'heart');
                            favIcon.style.width = '16px';
                            favIcon.style.height = '16px';
                            if (isFav) favIcon.style.fill = 'currentColor';
                            favBtn.appendChild(favIcon);
                            favBtn.onclick = (e) => {
                                e.stopPropagation();
                                toggleFav(items[i].id, e);
                            };
                            slot.appendChild(favBtn);

                            // Copy button (bottom-left)
                            const copyBtn = document.createElement('button');
                            copyBtn.className = 'folder-circle-btn copy';
                            const copyIcon = document.createElement('i');
                            copyIcon.setAttribute('data-lucide', 'copy');
                            copyIcon.style.width = '16px';
                            copyIcon.style.height = '16px';
                            copyBtn.appendChild(copyIcon);
                            copyBtn.onclick = (e) => {
                                e.stopPropagation();
                                copyCardPrompt(items[i], copyBtn);
                            };
                            slot.appendChild(copyBtn);

                            // Detail button (bottom-right)
                            const detailBtn = document.createElement('button');
                            detailBtn.className = 'folder-detail-btn';
                            detailBtn.innerHTML = '상세보기 <i data-lucide="arrow-right" style="width:12px;height:12px;"></i>';
                            detailBtn.onclick = (e) => {
                                e.stopPropagation();
                                openM(items[i].id);
                            };
                            slot.appendChild(detailBtn);

                            // Click on image opens modal
                            slot.onclick = (e) => {
                                if (e.target === img || e.target === overlay) {
                                    openM(items[i].id);
                                }
                            };
                        }
                    } else {
                        // 4th slot: "View all" button
                        slot.style.position = 'relative';

                        if (items.length > 3) {
                            slot.style.background = 'transparent';
                            const miniGrid = document.createElement('div');
                            miniGrid.className = 'folder-mini-grid';
                            for (let j = 3; j < Math.min(items.length, 7); j++) {
                                const mItem = document.createElement('div');
                                mItem.className = 'folder-mini-item';
                                const mImg = document.createElement('img');
                                mImg.src = items[j].img;
                                mImg.loading = 'lazy';
                                mImg.width = 400;
                                mImg.height = 400;
                                mItem.appendChild(mImg);
                                miniGrid.appendChild(mItem);
                            }
                            slot.appendChild(miniGrid);
                        } else if (items[3]) {
                            const img = document.createElement('img');
                            img.src = items[3].img;
                            img.loading = 'lazy';
                            img.decoding = 'async';
                            img.fetchPriority = 'low';
                            img.width = 400;
                            img.height = 400;
                            slot.appendChild(img);
                        }

                        // View all overlay button
                        const viewAllBtn = document.createElement('button');
                        viewAllBtn.className = 'folder-view-all-btn';
                        viewAllBtn.innerHTML = `"${cat.tag}" 전체 보기`;
                        viewAllBtn.onclick = goToList;
                        slot.appendChild(viewAllBtn);
                    }
                    grid.appendChild(slot);
                }

                const label = document.createElement('div');
                label.className = 'folder-label';
                label.textContent = `${cat.tag} (${items.length})`;
                label.onclick = goToList;

                folder.appendChild(grid);
                folder.appendChild(label);
                libraryContainer.appendChild(folder);
            });

            // Others card
            if (minorCategories.length > 0) {
                const othersCard = document.createElement('div');
                othersCard.className = 'library-folder';

                const folderGrid = document.createElement('div');
                folderGrid.className = 'folder-grid';
                folderGrid.style.cssText = 'display:block; overflow-y:auto; padding:16px; background:#f5f5f5;';

                const header = document.createElement('h4');
                header.style.cssText = 'margin:0 0 12px 0; font-size:14px; color:#666;';
                header.textContent = '기타 카테고리';
                folderGrid.appendChild(header);

                const tagContainer = document.createElement('div');
                tagContainer.style.cssText = 'display:flex; flex-wrap:wrap; gap:8px;';
                minorCategories.forEach(cat => {
                    const btn = document.createElement('button');
                    btn.className = 'minor-tag-btn';
                    btn.textContent = cat.tag + ' ';
                    const countSpan = document.createElement('span');
                    countSpan.style.opacity = '0.5';
                    countSpan.textContent = '(' + cat.items.length + ')';
                    btn.appendChild(countSpan);
                    btn.addEventListener('click', () => goToTag(cat.tag));
                    tagContainer.appendChild(btn);
                });
                folderGrid.appendChild(tagContainer);

                const folderLabel = document.createElement('div');
                folderLabel.className = 'folder-label';
                folderLabel.textContent = 'Others';

                othersCard.appendChild(folderGrid);
                othersCard.appendChild(folderLabel);
                libraryContainer.appendChild(othersCard);
            }

            // Promo banners (insert randomly)
            const createPromoBanner = (href, imgSrc, labelText, labelColor, bannerId) => {
                const banner = document.createElement('a');
                banner.className = 'library-folder';
                banner.dataset.promo = 'true';
                banner.href = href;
                banner.target = '_blank';
                banner.style.textDecoration = 'none';
                banner.onclick = () => {
                    window.dataLayer.push({
                        'event': 'promo_banner_click',
                        'site': 'evaluation',
                        'banner_id': bannerId,
                        'banner_name': labelText
                    });
                };
                banner.innerHTML = `
                    <div class="folder-grid" style="padding:0; overflow:hidden; position:relative;">
                        <img src="${imgSrc}" alt="${labelText}" loading="lazy" decoding="async" fetchpriority="low" width="1024" height="1024" style="width:100%; height:100%; object-fit:cover; grid-column:1/-1; grid-row:1/-1;">
                        <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:#fff; font-size:24px; font-weight:700; padding:6px 18px; border-radius:12px; letter-spacing:1.5px;">출시했어요!</span>
                    </div>
                    <div class="folder-label" style="color:${labelColor};">🎬 ${labelText}</div>
                `;
                return banner;
            };

            const promoBanner1 = document.createElement('div');
            promoBanner1.className = 'library-folder';
            promoBanner1.style.cursor = 'default';

            const tweetMatch = typeof featuredTweets !== 'undefined' && featuredTweets.length > 0 ? featuredTweets[0] : null;
            const dateStr = tweetMatch ? tweetMatch.date : '';

            const squareBox = document.createElement('div');
            squareBox.className = 'folder-grid';
            squareBox.style.cssText = 'padding: 0; background: #fff; border: 1px solid #ddd; overflow: hidden; display: flex; flex-direction: column; position: relative; max-width: 100%; box-sizing: border-box;';

            const innerHeader = document.createElement('div');
            innerHeader.style.cssText = 'padding: 6px 12px; text-align: center; font-size: 11px; color: #999; background: #fafafa; border-bottom: 1px solid #eee; width: 100%; box-sizing: border-box; flex-shrink: 0;';
            innerHeader.textContent = '🍌 주목 뉴스 (' + dateStr + ')';

            const tweetContainer = document.createElement('div');
            tweetContainer.style.cssText = 'padding: 4px; flex-grow: 1; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; background: #fff; width: 100%; box-sizing: border-box;';
            tweetContainer.innerHTML = '<span style="color:#999; font-size:12px;">로딩 중...</span>';

            squareBox.appendChild(innerHeader);
            squareBox.appendChild(tweetContainer);
            promoBanner1.appendChild(squareBox);

            const folderLabel = document.createElement('div');
            folderLabel.className = 'folder-label';
            folderLabel.style.color = '#1DA1F2';
            folderLabel.style.fontWeight = '800';
            folderLabel.textContent = '📰 주목 뉴스';
            promoBanner1.appendChild(folderLabel);

            if (tweetMatch) {
                const tweetIdResult = tweetMatch.url.match(/status\/(\d+)/);
                if (tweetIdResult && window.twttr) {
                    window.twttr.ready((t) => {
                        t.widgets.createTweet(
                            tweetIdResult[1],
                            tweetContainer,
                            {
                                theme: 'light',
                                align: 'center',
                                dnt: true,
                                conversation: 'none'
                            }
                        ).then(() => {
                            if (tweetContainer.querySelector('span')) {
                                tweetContainer.querySelector('span').remove();
                            }
                            const iframe = tweetContainer.querySelector('iframe');
                            if (iframe) {
                                iframe.style.maxWidth = '100%';
                                iframe.style.width = '100%';
                            }
                        });
                    });
                }
            }

            const promoBanner2 = createPromoBanner(
                'https://www.youtube.com/watch?v=ROiNhmOIByY',
                '../images/nanoNL_banner.webp',
                'BananaNL - YouTube',
                '#1DB954',
                'nanoNL'
            );

            // Insert promos at specific position ranges
            // 1st banner: positions 1-2 (index 0-1) - top priority
            // 2nd banner: positions 9-12 (index 8-11)
            const allFolders = Array.from(libraryContainer.children);
            if (allFolders.length >= 1) {
                const pos1 = Math.floor(Math.random() * 2); // index 0-1 (positions 1-2)
                if (pos1 < allFolders.length) {
                    libraryContainer.insertBefore(promoBanner1, allFolders[pos1]);
                } else {
                    libraryContainer.appendChild(promoBanner1);
                }
            }
            if (allFolders.length >= 9) {
                const updatedFolders = Array.from(libraryContainer.children);
                const pos2 = Math.floor(Math.random() * 4) + 8; // index 8-11 (positions 9-12)
                if (pos2 < updatedFolders.length) {
                    libraryContainer.insertBefore(promoBanner2, updatedFolders[pos2]);
                } else {
                    libraryContainer.appendChild(promoBanner2);
                }
            }

            // Initialize Lucide icons for hover buttons
            safeLucideCreate();
        }

        window.goToTag = (tag) => {
            activeTag = tag;
            if (activeTag !== 'Business') bizSubFilter = 'all';
            viewMode = 'masonry';
            updateTabsUI(tag);
            renderGallery();
            // Update URL with tab parameter
            const newUrl = new URL(window.location);
            if (tag === 'ALL') {
                newUrl.searchParams.delete('tab');
            } else {
                newUrl.searchParams.set('tab', tag);
            }
            newUrl.searchParams.delete('id');
            history.pushState({ tab: tag }, '', newUrl);
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };

        function onSearchInput() {
            searchQuery = document.getElementById('search').value.toLowerCase();
            if (searchQuery) {
                viewMode = 'masonry';
            } else if (activeTag === 'ALL') {
                viewMode = (getGroupMode() === 'tile') ? 'overview' : 'masonry';
            }
            renderGallery();
        }

        function updateTabsUI(tag) {
            Array.from(tabArea.children).forEach(btn => {
                // Use data-tag for exact matching
                const isMatch = btn.dataset.tag === tag;
                if (isMatch) {
                    Array.from(tabArea.children).forEach(c => c.classList.remove('active'));
                    btn.classList.add('active');
                    // Scroll the active tab to center
                    btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }
        // === End App Library Functions ===

        function render() {
            const q = document.getElementById('search').value.toLowerCase();
            const s = document.getElementById('sort').value;
            const favIds = getFavs();

            // --- History & Favorites Visibility Logic ---
            const mode = getUserMode();
            const favLimit = mode === 'pro' ? 12 : 3;
            const histLimit = mode === 'pro' ? 4 : 1;

            // For DISPLAY ONLY: slice the arrays.
            // Note: toggleFav already limits storage, but if we just switched from Pro to Normal without adding, 
            // storage might still have 12. We should only show 3.
            const visibleFavIds = favIds.slice(0, favLimit);

            const historyIds = getHistory().slice(0, histLimit);
            const lastId = historyIds[0]; // Keep compatibility for "history" badge logic (showing top one as 'LAST COPIED'?)
            // Actually, we want to show ALL history items in the grid if possible, or just pin them?
            // Original logic: "Feature" -> "History" (just one) -> "Favorites" -> "Recommendations"
            // Now we have multiple history items.
            // Let's iterate historyIds.

            let pinned = [];

            // 1. History (New First)
            historyIds.forEach(hid => {
                const item = data.find(d => d.id === hid);
                if (item && !pinned.find(p => p.id === item.id)) {
                    pinned.push({ ...item, type: 'history' });
                }
            });

            // 2. Favorites (New Second)
            visibleFavIds.forEach(id => {
                if (pinned.find(p => p.id === id)) return;
                const item = data.find(d => d.id === id);
                if (item) pinned.push({ ...item, type: 'favorite' });
            });

            // 3. Feature (New Third)
            const featureItems = data.filter(d => d.tags && d.tags.includes('Special'));
            featureItems.forEach(item => {
                // Avoid duplication if already in history/favorites (unlikely but safe)
                if (pinned.find(p => p.id === item.id)) return;
                pinned.push({ ...item, type: 'feature' });
            });

            // 4. Recommendations
            recommendations.forEach(id => {
                if (pinned.find(p => p.id === id)) return;
                const item = data.find(d => d.id === id);
                if (item) pinned.push({ ...item, type: 'recommendation' });
            });

            const pinnedIds = pinned.map(p => p.id);
            let common = [...data].filter(d => !pinnedIds.includes(d.id));

            // Apply search and tag filter to both pinned and common items
            const allFavIds = getFavs();
            const allHistoryIds = getHistory();

            const matchesFilter = (d) => {
                const matchSearch = d.name.toLowerCase().includes(q) || String(d.number).includes(q);
                let matchTag;
                if (activeTag === 'ALL') {
                    matchTag = true;
                } else if (activeTag === 'favorites') {
                    matchTag = allFavIds.includes(d.id);
                } else if (activeTag === 'history') {
                    matchTag = allHistoryIds.includes(d.id);
                } else if (activeTag === 'recommendations') {
                    matchTag = recommendations.includes(d.id);
                } else {
                    matchTag = d.tags && d.tags.includes(activeTag);
                }
                // Business sub-filter
                if (activeTag === 'Business' && bizSubFilter !== 'all') {
                    if (d.category !== bizSubFilter) return false;
                }
                return matchSearch && matchTag;
            };

            let filteredPinned, filteredCommon;
            if (activeTag === 'favorites' || activeTag === 'history' || activeTag === 'recommendations') {
                // For favorites/history/recommendations, show all matching items without pinned separation
                filteredPinned = [];
                filteredCommon = [...data].filter(matchesFilter);
                // Sort by the order in the list (most recent first for fav/history, curated order for recommendations)
                let orderIds;
                if (activeTag === 'favorites') orderIds = allFavIds;
                else if (activeTag === 'history') orderIds = allHistoryIds;
                else orderIds = recommendations;
                filteredCommon.sort((a, b) => orderIds.indexOf(a.id) - orderIds.indexOf(b.id));
            } else {
                filteredPinned = pinned.filter(matchesFilter);
                filteredCommon = common.filter(matchesFilter);
            }

            // Apply sort only for normal tags (not favorites/history/recommendations which have their own order)
            if (activeTag !== 'favorites' && activeTag !== 'history' && activeTag !== 'recommendations') {
                if (s === 'popular' && styleRanking && styleRanking.order) { const order = styleRanking.order; filteredCommon.sort((a, b) => { const ai = order.indexOf(a.id); const bi = order.indexOf(b.id); return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi); }); } else if (s === 'score_desc') filteredCommon.sort((a, b) => b.total - a.total);
                else if (s === 'id') filteredCommon.sort((a, b) => a.number - b.number);
            }

            const finalDisplay = [...filteredPinned, ...filteredCommon];
            const grid = document.getElementById('grid');
            const fragment = document.createDocumentFragment();

            finalDisplay.forEach(d => {
                const isFav = favIds.includes(d.id);
                const card = document.createElement('div');
                card.className = 'article-card';
                if (d.id && d.id.startsWith('biz_')) card.classList.add('biz-card');
                if (d.type === 'feature') {
                    card.classList.add('featured');
                }
                card.addEventListener('click', () => openM(d.id));

                // ---------------------------------------------------------
                // Feature Card Structure (Stacked)
                // ---------------------------------------------------------
                if (d.type === 'feature' && d.author && d.author.post_url) {
                    // 1. Back Layer (X Post Embed)
                    const authorLayer = document.createElement('div');
                    authorLayer.className = 'author-layer';
                    authorLayer.style.overflow = 'auto'; // Allow scrolling if needed
                    authorLayer.innerHTML = `
                        <div class="author-label">This prompt is created by</div>
                        <blockquote class="twitter-tweet" data-theme="light" data-cards="hidden" data-conversation="none">
                            <a href="${d.author.post_url}"></a>
                        </blockquote>
                    `;
                    // Prevent click from propagating to card modal
                    authorLayer.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });
                    card.appendChild(authorLayer);




                    // 2. Front Layer (Main Content)
                    const frontLayer = document.createElement('div');
                    frontLayer.className = 'front-layer';

                    // Pin Badge (on Card, z-index 20)
                    const pin = createPinBadge(d.type);
                    if (pin) card.appendChild(pin);

                    // Content inside Front Layer
                    appendCardContent(d, frontLayer, isFav);
                    card.appendChild(frontLayer);

                } else {
                    // ---------------------------------------------------------
                    // Standard Card Structure
                    // ---------------------------------------------------------
                    const pin = createPinBadge(d.type);
                    if (pin) card.appendChild(pin);
                    appendCardContent(d, card, isFav);
                }

                fragment.appendChild(card);
            });

            grid.replaceChildren(fragment);

            // Insert promo banners at specific positions (same logic as overview)
            const createMasonryBanner = (href, imgSrc, labelText, labelColor, bannerId) => {
                const banner = document.createElement('a');
                banner.className = 'article-card promo-banner-card';
                banner.href = href;
                banner.target = '_blank';
                banner.style.textDecoration = 'none';
                banner.onclick = (e) => {
                    window.dataLayer.push({
                        'event': 'promo_banner_click',
                        'site': 'evaluation',
                        'banner_id': bannerId,
                        'banner_name': labelText
                    });
                };
                banner.innerHTML = `
                    <div class="thumb-box" style="position:relative;">
                        <img src="${imgSrc}" alt="${labelText}" loading="lazy" decoding="async" fetchpriority="low" width="1024" height="1024" style="width:100%; height:auto; display:block;">
                        <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.6); color:#fff; font-size:18px; font-weight:700; padding:4px 12px; border-radius:8px; letter-spacing:1px;">출시했어요!</span>
                    </div>
                    <div class="meta-line" style="padding:0.5rem;">
                        <span style="color:${labelColor}; font-weight:600; font-size:0.85rem;">🎬 ${labelText}</span>
                    </div>
                `;
                return banner;
            };

            // Helper to insert Tweet Cards
            const createTweetCard = (url, date) => {
                const card = document.createElement('div');
                card.className = 'article-card tweet-card';
                card.style.padding = '0';
                card.style.background = '#fff';
                card.style.border = '1px solid #ddd';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.justifyContent = 'flex-start';
                card.style.overflow = 'hidden';
                card.style.maxHeight = '460px';

                const headerLabel = document.createElement('div');
                headerLabel.style.cssText = 'padding: 6px 12px; text-align: center; font-size: 11px; color: #999; background: #fafafa; border-bottom: 1px solid #eee;';
                headerLabel.textContent = '🍌 주목 뉴스 (' + (date || '') + ')';
                card.appendChild(headerLabel);

                const tweetContainer = document.createElement('div');
                tweetContainer.style.cssText = 'padding: 4px; flex-grow: 1; overflow: hidden; display: flex; align-items: flex-start; justify-content: center; background: #fff;';
                tweetContainer.innerHTML = '<span style="color:#999; font-size:12px;">로딩 중...</span>';
                card.appendChild(tweetContainer);

                const match = url.match(/status\/(\d+)/);
                if (match) {
                    const tweetId = match[1];
                    const renderTweet = () => {
                        if (window.twttr && window.twttr.widgets) {
                            tweetContainer.innerHTML = '';
                            window.twttr.widgets.createTweet(tweetId, tweetContainer, {
                                theme: 'light',
                                dnt: true,
                                width: 320
                            }).then((el) => {
                                if (!el) {
                                    tweetContainer.innerHTML = '<a href="' + url + '" target="_blank" style="color:#1DA1F2; font-size:13px;">게시물 보기 →</a>';
                                }
                            }).catch(() => {
                                tweetContainer.innerHTML = '<a href="' + url + '" target="_blank" style="color:#1DA1F2; font-size:13px;">게시물 보기 →</a>';
                            });
                        } else {
                            setTimeout(renderTweet, 1000);
                        }
                    };
                    renderTweet();
                }

                card.addEventListener('click', (e) => e.stopPropagation());
                return card;
            };

            let allCards = Array.from(grid.children);

            if (activeTag === 'ALL' && typeof featuredTweets !== 'undefined' && featuredTweets.length > 0) {
                featuredTweets.forEach((tweet, index) => {
                    const tweetCard = createTweetCard(tweet.url, tweet.date);
                    const insertPos = 2 + (index * 6);
                    if (insertPos < allCards.length) {
                        grid.insertBefore(tweetCard, allCards[insertPos]);
                    } else {
                        grid.appendChild(tweetCard);
                    }
                    allCards = Array.from(grid.children);
                });
            }

            const updatedCards = Array.from(grid.children);
            if (updatedCards.length >= 9 && activeTag !== 'Business') {
                const masonryBanner2 = createMasonryBanner(
                    'https://www.youtube.com/watch?v=ROiNhmOIByY',
                    '../images/nanoNL_banner.webp',
                    'BananaNL - YouTube',
                    '#1DB954',
                    'nanoNL'
                );
                const pos2 = Math.floor(Math.random() * 4) + 8; // index 8-11 (positions 9-12)
                if (pos2 < updatedCards.length) {
                    grid.insertBefore(masonryBanner2, updatedCards[pos2]);
                } else {
                    grid.appendChild(masonryBanner2);
                }
            }

            safeLucideCreate();
            // Load Twitter widgets when ready
            if (window.twttr) {
                window.twttr.ready((t) => {
                    t.widgets.load(grid);
                });
            }
        }

        function appendCardContent(d, container, isFav) {
            const thumbBox = document.createElement('div');
            thumbBox.className = 'thumb-box';
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.fetchPriority = 'low';
            img.width = 400;
            img.height = 400;
            img.src = d.img;
            img.alt = d.name || '';
            const overlay = document.createElement('div');
            overlay.className = 'overlay';
            thumbBox.appendChild(img);
            thumbBox.appendChild(overlay);
            container.appendChild(thumbBox);

            const metaLine = document.createElement('div');
            metaLine.className = 'meta-line';
            const idBadge = document.createElement('span');
            idBadge.className = 'id-badge';
            idBadge.textContent = '#' + String(d.number).padStart(2, '0');
            const scoreVal = document.createElement('span');
            scoreVal.className = 'score-val';
            if (d.total) {
                scoreVal.textContent = `${d.total} PTS`;
            } else {
                const _catL = { '業種': '업종', 'シーン': '씬', 'スタイル': '스타일', 'テイスト': '테이스트' }; scoreVal.textContent = _catL[d.category] || d.category || '';
            }
            metaLine.appendChild(idBadge);
            metaLine.appendChild(scoreVal);
            container.appendChild(metaLine);

            if (typeof window.getEnterpriseShareCount === 'function') {
                const enterpriseCount = window.getEnterpriseShareCount(d.id);
                if (enterpriseCount > 0) {
                    const enterpriseBadge = document.createElement('div');
                    enterpriseBadge.className = 'meta-line';
                    enterpriseBadge.style.paddingTop = '0';
                    enterpriseBadge.innerHTML = `<span style="font-size:12px;color:#455A64;background:#ECEFF1;padding:2px 8px;border-radius:999px;">🏢 기업 내 ${enterpriseCount}회 공유</span>`;
                    container.appendChild(enterpriseBadge);
                }
            }

            // Category badge for business items
            if (d.id && d.id.startsWith('biz_') && d.category) {
                const catEmojis = { '業種': '🏢', 'シーン': '📋', 'スタイル': '🎨', 'テイスト': '🖼️' };
                const catLabels = { '業種': '업종', 'シーン': '씬', 'スタイル': '스타일', 'テイスト': '테이스트' };
                const badge = document.createElement('div');
                badge.className = 'biz-category-badge';
                badge.textContent = (catEmojis[d.category] || '') + ' ' + (catLabels[d.category] || d.category);
                container.appendChild(badge);
            }

            const title = document.createElement('div');
            title.className = 'article-title';
            title.textContent = d.name || '';
            container.appendChild(title);

            const favBtn = document.createElement('button');
            favBtn.className = `fav-btn ${isFav ? 'active' : ''}`.trim();
            favBtn.addEventListener('click', (event) => toggleFav(d.id, event));
            const favIcon = document.createElement('i');
            favIcon.setAttribute('data-lucide', 'heart');
            favIcon.style.width = '18px';
            favIcon.style.height = '18px';
            if (isFav) favIcon.style.fill = 'currentColor';
            favBtn.appendChild(favIcon);
            container.appendChild(favBtn);

            // Action Button Group (Split Button)
            const actionGroup = document.createElement('div');
            actionGroup.className = 'action-btn-group';

            // Left: Copy Button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'split-btn';
            const copyIcon = document.createElement('i');
            copyIcon.setAttribute('data-lucide', 'copy'); // Changed to 'copy' icon
            copyIcon.style.width = '14px';
            copyIcon.style.height = '14px';
            copyBtn.appendChild(copyIcon);
            copyBtn.appendChild(document.createTextNode('✨ プロンプトCOPY'));

            // Stop propagation to prevent modal open
            copyBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                copyCardPrompt(d, e.currentTarget);
            });

            // Right: Detail Button
            const detailBtn = document.createElement('button');
            detailBtn.className = 'split-btn';
            const detailIcon = document.createElement('i');
            detailIcon.setAttribute('data-lucide', 'scan-eye');
            detailIcon.style.width = '14px';
            detailIcon.style.height = '14px';
            detailBtn.appendChild(detailIcon);
            detailBtn.appendChild(document.createTextNode('상세 / 🍌BananaNL'));

            // Open Modal
            detailBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                openM(d.id);
            });

            actionGroup.appendChild(copyBtn);
            actionGroup.appendChild(detailBtn);
            container.appendChild(actionGroup);
        }

        // Quick Copy Function for Card
        window.copyCardPrompt = async function (item, btnElement) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'copy_prompt_list',
                'site': 'evaluation',
                'item_id': item.id,
                'item_name': item.name,
                'user_mode': getUserMode()
            });
            // Track action for badge system
            if (typeof incrementAction === 'function') incrementAction('copy');
            addToHistory(item.id);
            if (typeof updateSpecialTabCounts === 'function') updateSpecialTabCounts();

            // Append Mojibake Prevention Prompt for Japanese version
            const mojibakePrevention = "";
            const fullItem = await getItemById(item.id);
            const yamlText = (fullItem && fullItem.yaml) ? fullItem.yaml : (item.yaml || '');
            const textToCopy = yamlText + mojibakePrevention;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const oldHTML = btnElement.innerHTML;
                btnElement.classList.add('copied');
                // Temporary change style manually as class might be limited
                const originalBg = btnElement.style.background;
                const originalColor = btnElement.style.color;

                btnElement.style.background = 'var(--accent)';
                btnElement.style.color = '#fff';
                btnElement.innerHTML = '<i data-lucide="check" style="width:14px;height:14px;"></i> COPIED';
                safeLucideCreate();

                if (typeof showToast === 'function') {
                    showToast('클립보드에 복사되었습니다');
                }

                showFavoriteNudge({ id: item.id, name: item.name }, 'copy_prompt_list');

                if (typeof scheduleShareNudge === 'function') {
                    scheduleShareNudge('「#BananaX」🍌 をつけてSNS投稿すると ✨ みんなが見つけやすくなるよ！🔍', item.id, item.name);
                }

                setTimeout(() => {
                    btnElement.classList.remove('copied');
                    btnElement.style.background = originalBg;
                    btnElement.style.color = originalColor;
                    btnElement.innerHTML = oldHTML;
                    safeLucideCreate();
                }, 3000);
            });
        }



        window.openM = async function (id) {
            const d = await getItemById(id);
            if (!d) {
                showToast('見つかりませんでした');
                return;
            }
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                'event': 'modal_open',
                'site': 'evaluation',
                'item_id': d.id,
                'item_name': d.name,
                'user_mode': getUserMode()
            });
            // Track action for badge system
            if (typeof incrementAction === 'function') incrementAction('modal_open');
            window.currentItemId = d.id;
            window.currentItemName = d.name;
            window.currentYaml = d.yaml;
            const modalImg = document.getElementById('m-img');
            modalImg.src = d.img;
            modalImg.alt = d.name || '';
            configureModalBizAd(d);
            document.getElementById('m-id').innerText = 'STYLE #' + String(d.number).padStart(2, '0');
            document.getElementById('m-title').innerText = d.name;
            const mTotalEl = document.getElementById('m-total');
            if (mTotalEl) {
                mTotalEl.innerText = d.total ? d.total : (d.category || '');
            }

            // Badges (Compatible with...)
            const badgesContainer = document.getElementById('m-badges');

            // Corporate Share Badge Logic (MVP)
            let corpBadgeHtml = '';
            try {
                const refType = sessionStorage.getItem('bx_referrer_type');
                const browType = sessionStorage.getItem('bx_browser_type');
                let corpName = '';

                if (browType === 'lineworks_inapp') corpName = 'LINE WORKS';
                else if (browType === 'teams_inapp' || refType === 'teams') corpName = 'Teams';
                else if (refType === 'cybozu') corpName = 'Cybozu';

                if (corpName) {
                    const hash = String(id).split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
                    const count = 12 + (Math.abs(hash) % 329);

                    corpBadgeHtml = `
                        <span style="display:flex; align-items:center; gap:4px; font-size:0.75rem; background:#E3F2FD; border:1px solid #90CAF9; padding:2px 8px; border-radius:4px; color:#1565C0; font-weight:700;">
                            <i data-lucide="building-2" style="width:12px;height:12px;"></i>
                            ${corpName}에서 ${count}회 공유
                        </span>
                    `;
                }
            } catch (e) { console.error(e); }

            // Hardcoded compatibility for now as per requirement
            badgesContainer.innerHTML = corpBadgeHtml + `
                <span style="font-size:0.7rem; background:#eee; padding:2px 8px; border-radius:4px; color:#555; font-family:var(--font-mono);">
                    Compatible with: Nano Banana, NotebookLM, ChatGPT
                </span>
            `;

            // Favorite Button State
            const favs = getFavs();
            const modalFavBtn = document.getElementById('m-fav-btn');
            if (modalFavBtn) {
                if (favs.includes(d.id)) {
                    modalFavBtn.classList.add('active');
                    modalFavBtn.style.color = 'var(--accent)';
                    modalFavBtn.style.borderColor = 'var(--accent)';
                    modalFavBtn.style.background = '#fff';
                    modalFavBtn.innerHTML = '<i data-lucide="heart" style="width:12px;height:12px;fill:currentColor;"></i><span class="action-btn__label"> 저장됨</span>';
                } else {
                    modalFavBtn.classList.remove('active');
                    modalFavBtn.style.color = '';
                    modalFavBtn.style.borderColor = '';
                    modalFavBtn.style.background = '';
                    modalFavBtn.innerHTML = '<i data-lucide="heart" style="width:12px;height:12px;"></i><span class="action-btn__label"> 즐겨찾기</span>';
                }
                safeLucideCreate();
                if (!favs.includes(d.id)) {
                    emitFavoriteCtaImpression(d);
                }
            }

            renderYaml(document.getElementById('m-yaml'), d.yaml);
            const isBiz = d.id && d.id.startsWith('biz_');
            const radarBlock = document.querySelector('.m-radar-block');
            const totalRow = document.querySelector('.m-total-row');
            if (isBiz) {
                if (radarBlock) radarBlock.style.display = 'none';
                if (totalRow) {
                    const catEmojis = { '業種': '🏢', 'シーン': '📋', 'スタイル': '🎨', 'テイスト': '🖼️' };
                    const catLabelsM = { '業種': '업종', 'シーン': '씬', 'スタイル': '스타일', 'テイスト': '테이스트' };
                    totalRow.innerHTML = '<div class="m-total" style="color:#6C63FF;">' + (catEmojis[d.category] || '💼') + ' ' + (catLabelsM[d.category] || d.category || 'Business') + '</div>';
                }
                document.getElementById('m-score-grid').innerHTML = '';
                document.getElementById('m-comments-container').innerHTML = '';
            } else {
                if (radarBlock) radarBlock.style.removeProperty('display');
                if (totalRow) {
                    totalRow.innerHTML = '<div class="m-total">TOTAL SCORE: <strong id="m-total">' + (d.total || '00') + '</strong> / 50</div>';
                }
                renderScoreGrid(document.getElementById('m-score-grid'), d.scores || {});
                renderComments(document.getElementById('m-comments-container'), d.scores || {}, d.comments || {});
            }
            const modal = document.querySelector('.modal-sheath');
            modal.classList.add('active');
            gsap.fromTo('.modal-content', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
            document.body.style.overflow = 'hidden';
            // Update URL with item ID
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('id', id);
            history.pushState({ modalId: id }, '', newUrl);
            // Render radar chart only if item has scores
            if (!isBiz && d.total && Object.keys(d.scores || {}).length > 0) {
                const ctx = document.getElementById('radar').getContext('2d');
                if (chart && typeof chart.destroy === 'function') chart.destroy();
                chart = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: Object.keys(d.scores).map(k => JP[k]),
                        datasets: [{
                            data: Object.values(d.scores),
                            backgroundColor: 'rgba(229,80,57,0.1)',
                            borderColor: '#E55039',
                            borderWidth: 2,
                            pointBackgroundColor: '#E55039',
                            pointRadius: 3
                        }]
                    },
                    options: {
                        maintainAspectRatio: false,
                        scales: {
                            r: {
                                min: 0,
                                max: 10,
                                ticks: { display: false },
                                grid: { color: '#eee' },
                                pointLabels: {
                                    font: { size: 11, family: 'Noto Sans JP' }
                                }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            } else {
                // Clear chart for business items
                if (chart) {
                    chart.destroy();
                    chart = null;
                }
                const canvasEl = document.getElementById('radar');
                if (canvasEl) {
                    const ctx = canvasEl.getContext('2d');
                    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
                }
            }
        }


        window.closeM = function () {
            document.querySelector('.modal-sheath').classList.remove('active');
            const supportSlots = document.getElementById('m-support-slots');
            if (supportSlots) supportSlots.classList.remove('active');
            document.body.style.overflow = '';
            // Revert URL to base (remove id param)
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('id');
            history.pushState({}, '', newUrl);
        }

        document.addEventListener('click', (e) => {
            const supportAnchor = e.target.closest('.m-support-item');
            if (!supportAnchor) return;
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
                event: 'support_slot_click',
                site: 'evaluation',
                slot_name: supportAnchor.dataset.slotName || 'modal_left_support_unknown',
                banner_id: supportAnchor.dataset.bannerId || 'support_unknown',
                item_id: window.currentItemId || ''
            });
        });
        // Share style URL function
        // UTM helper for share tracking (#102)
        function appendUtm(url, source, medium, campaign) {
            try {
                const u = new URL(url);
                u.searchParams.set('utm_source', source);
                u.searchParams.set('utm_medium', medium || 'share');
                u.searchParams.set('utm_campaign', campaign || 'banana_x_prompt');
                return u.toString();
            } catch (e) { return url; }
        }

        window.shareToX = function () {
            const text = encodeURIComponent(window.currentItemName + ' — Banana X Prompt Patterns');
            const url = encodeURIComponent(appendUtm(window.location.href, 'x', 'social'));
            window.open('https://x.com/intent/tweet?text=' + text + '&url=' + url, '_blank');
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'event': 'share_social', 'platform': 'x', 'item_id': window.currentItemId });
        }
        window.shareToThreads = function () {
            const text = encodeURIComponent(window.currentItemName + ' — Banana X\n' + appendUtm(window.location.href, 'threads', 'social'));
            window.open('https://www.threads.net/intent/post?text=' + text, '_blank');
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'event': 'share_social', 'platform': 'threads', 'item_id': window.currentItemId });
        }
        window.shareToWork = function () {
            const name = window.currentItemName || 'Banana X';
            const url = appendUtm(window.location.href, 'internal_share', 'chat');
            const template = '📌 ' + name + '\n\nAI 이미지 생성 프롬프트 패턴입니다. 이 스타일을 사용하면 프로 품질의 이미지를 쉽게 만들 수 있습니다.\n\n▶ 체험하기: ' + url;
            navigator.clipboard.writeText(template).then(() => {
                const btn = document.getElementById('share-work-btn');
                const old = btn.innerHTML;
                btn.classList.add('copied');
                btn.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i>✓';
                safeLucideCreate();
                showToast('팀 공유용 텍스트를 복사했습니다 🏢');
                setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = old; safeLucideCreate(); }, 3000);
            });
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ 'event': 'share_internal', 'item_id': window.currentItemId, 'item_name': name });
        }
        window.copyPrompt = function () {
            window.dataLayer.push({
                'event': 'copy_prompt',
                'site': 'evaluation',
                'item_id': window.currentItemId,
                'item_name': window.currentItemName,
                'user_mode': getUserMode()
            });
            // Track action for badge system
            if (typeof incrementAction === 'function') incrementAction('copy');
            addToHistory(window.currentItemId);
            if (typeof updateSpecialTabCounts === 'function') updateSpecialTabCounts();
            // Append Mojibake Prevention Prompt for Japanese version
            const mojibakePrevention = "";
            const textToCopy = window.currentYaml + mojibakePrevention;

            navigator.clipboard.writeText(textToCopy).then(() => {
                const btn = document.getElementById('copy-btn');
                const old = btn.innerHTML;
                btn.classList.add('copied');
                btn.innerHTML = '<i data-lucide="check" style="width:12px;height:12px;"></i>COPIED';
                safeLucideCreate();

                // Highlight YAML content with text selection
                const yamlContent = document.getElementById('m-yaml');
                const range = document.createRange();
                range.selectNodeContents(yamlContent);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                setTimeout(() => {
                    selection.removeAllRanges();
                }, 1500);

                if (typeof showToast === 'function') {
                    showToast('클립보드에 복사되었습니다');
                }

                showFavoriteNudge({ id: window.currentItemId, name: window.currentItemName }, 'copy_prompt');

                if (typeof scheduleShareNudge === 'function') {
                    scheduleShareNudge('「#BananaX」🍌 をつけてSNS投稿すると ✨ みんなが見つけやすくなるよ！🔍', window.currentItemId, window.currentItemName);
                }


                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = old;
                    safeLucideCreate();
                }, 3000);
            });
        }

        // Listen for BananaNL save success
        window.addEventListener('banana-save-complete', (e) => {
            const name = e.detail.name || 'スタイル';
            showToast(`BananaNLに "${name}" を登録しました`);
        });

    