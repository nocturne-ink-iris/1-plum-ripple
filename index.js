import { extension_settings } from '../../../extensions.js';
import { saveSettingsDebounced } from '../../../../script.js';

const MODULE_NAME = 'plum_ripple_theme';
const CUSTOM_GFONT_LINK_ID = 'plum-custom-gfont';
const BG_LAYER_ID = 'plum-theme-bg';

const FONT_PRESETS = {
    neucha: { label: 'Neucha (рукописный)', family: "'Neucha', sans-serif" },
    pangolin: { label: 'Pangolin (рукописный)', family: "'Pangolin', sans-serif" },
    nunito: { label: 'Nunito (мягкий округлый)', family: "'Nunito', sans-serif" },
    rubik: { label: 'Rubik (чёткий округлый)', family: "'Rubik', sans-serif" },
    comfortaa: { label: 'Comfortaa (геометричный)', family: "'Comfortaa', sans-serif" },
    system: { label: 'Системный', family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif' },
    custom: { label: 'Свой шрифт...', family: '' },
};

const BG_PRESETS = {
    pastel_mountains: {
        label: 'Pastel Mountains (пиксель-арт)',
        type: 'image',
        value: new URL("./assets/bg's/Gemini_Generated_Image_ogsft0ogsft0ogsf.jpg", import.meta.url).href,
    },
    y2k_glitch: {
        label: 'Y2K Glitch (рабочий стол)',
        type: 'image',
        value: new URL("./assets/bg's/Gemini_Generated_Image_sumatesumatesuma.jpg", import.meta.url).href,
    },
    plum_gradient: {
        label: 'Сливовый градиент',
        type: 'gradient',
        value: 'radial-gradient(circle at 20% 20%, #673a69 0%, #2b152d 55%, #180d19 100%)',
    },
    tavern: {
        label: 'Фон Таверны (прозрачный)',
        type: 'tavern',
        value: '',
    },
};

const DEFAULT_SETTINGS = {
    fontPreset: 'neucha',
    customFont: '',
    fontSize: 1.30,
    bgPreset: 'pastel_mountains',
    bgDim: 45,
    bgBlur: 0,
};

/** @type {ReturnType<typeof setTimeout> | null} */
let customFontTimer = null;

function getSettings() {
    if (!extension_settings[MODULE_NAME]) {
        extension_settings[MODULE_NAME] = { ...DEFAULT_SETTINGS };
    }
    const settings = extension_settings[MODULE_NAME];
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (settings[key] === undefined) {
            settings[key] = value;
        }
    }
    return settings;
}

/**
 * Подгружает шрифт с Google Fonts по имени (если он там есть).
 * Если шрифт уже установлен локально в системе — браузер просто возьмёт локальный.
 * @param {string} fontName
 */
function loadGoogleFont(fontName) {
    const existing = document.getElementById(CUSTOM_GFONT_LINK_ID);
    const clean = fontName.trim();

    if (!clean) {
        if (existing) existing.remove();
        return;
    }

    const encoded = encodeURIComponent(clean).replace(/%20/g, '+');
    const href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@400;600;700&display=swap`;

    if (existing instanceof HTMLLinkElement) {
        if (existing.href !== href) {
            existing.href = href;
        }
        return;
    }

    const link = document.createElement('link');
    link.id = CUSTOM_GFONT_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
}

function ensureBgLayer() {
    let layer = document.getElementById(BG_LAYER_ID);
    if (!layer) {
        layer = document.createElement('div');
        layer.id = BG_LAYER_ID;
        document.body.prepend(layer);
    }
    return layer;
}

function applyBackgroundSettings() {
    const settings = getSettings();
    const layer = ensureBgLayer();
    const presetKey = settings.bgPreset in BG_PRESETS
        ? /** @type {keyof typeof BG_PRESETS} */ (settings.bgPreset)
        : 'pastel_mountains';
    const preset = BG_PRESETS[presetKey];

    // Затемнение и размытие применяем к картинке и градиенту
    const dimRatio = Math.min(0.9, Math.max(0, Number(settings.bgDim) / 100));
    const blurPx = Math.min(10, Math.max(0, Number(settings.bgBlur)));
    document.documentElement.style.setProperty('--theme-bg-dim', String(dimRatio));
    document.documentElement.style.setProperty('--theme-bg-blur', `${blurPx}px`);

    if (preset.type === 'tavern') {
        layer.style.display = 'none';
        layer.style.backgroundImage = '';
        layer.style.backgroundColor = '';
        return;
    }

    layer.style.display = 'block';
    layer.style.backgroundColor = '#180d19';
    layer.style.backgroundImage = preset.type === 'image' ? `url("${preset.value}")` : preset.value;
}

function applyThemeSettings() {
    const settings = getSettings();
    const root = document.documentElement;

    let fontFamily = FONT_PRESETS.neucha.family;
    if (settings.fontPreset === 'custom') {
        const cleanName = settings.customFont.trim();
        fontFamily = cleanName ? `"${cleanName}", sans-serif` : FONT_PRESETS.system.family;
        loadGoogleFont(cleanName);
    } else if (settings.fontPreset in FONT_PRESETS) {
        const key = /** @type {keyof typeof FONT_PRESETS} */ (settings.fontPreset);
        fontFamily = FONT_PRESETS[key].family;
    }

    root.style.setProperty('--theme-font', fontFamily);
    root.style.setProperty('--theme-font-size', `${settings.fontSize}em`);

    applyBackgroundSettings();
}

function renderSettingsUI() {
    const container = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
    if (!container || document.getElementById('plum-ripple-settings')) {
        return;
    }

    const settings = getSettings();
    const fontOptionsHtml = Object.entries(FONT_PRESETS)
        .map(([key, { label }]) => `<option value="${key}" ${settings.fontPreset === key ? 'selected' : ''}>${label}</option>`)
        .join('');

    const bgOptionsHtml = Object.entries(BG_PRESETS)
        .map(([key, { label }]) => `<option value="${key}" ${settings.bgPreset === key ? 'selected' : ''}>${label}</option>`)
        .join('');

    const wrapper = document.createElement('div');
    wrapper.id = 'plum-ripple-settings';
    wrapper.className = 'extension_container';
    wrapper.innerHTML = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>Plum Ripple Theme</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <div class="flex-container flexFlowColumn" style="gap: 8px; padding: 6px 0;">
                    <label for="plum-bg-select">Фон темы</label>
                    <select id="plum-bg-select" class="text_pole">${bgOptionsHtml}</select>

                    <label for="plum-bg-dim-range">
                        Затемнение фона: <span id="plum-bg-dim-val">${settings.bgDim}</span>%
                    </label>
                    <input id="plum-bg-dim-range" type="range" min="0" max="90" step="5" value="${settings.bgDim}">

                    <label for="plum-bg-blur-range">
                        Размытие фона: <span id="plum-bg-blur-val">${settings.bgBlur}</span>px
                    </label>
                    <input id="plum-bg-blur-range" type="range" min="0" max="10" step="1" value="${settings.bgBlur}">

                    <hr style="width: 100%; opacity: 0.2; margin: 4px 0;">

                    <label for="plum-font-select">Шрифт интерфейса и чата</label>
                    <select id="plum-font-select" class="text_pole">${fontOptionsHtml}</select>

                    <div id="plum-custom-font-wrap" style="display: ${settings.fontPreset === 'custom' ? 'block' : 'none'};">
                        <label for="plum-custom-font-input">Название шрифта (с Google Fonts или из системы)</label>
                        <input id="plum-custom-font-input" type="text" class="text_pole" placeholder="Например: Montserrat или Segoe UI">
                    </div>

                    <label for="plum-font-size-range">
                        Размер текста чата: <span id="plum-font-size-val">${settings.fontSize.toFixed(2)}</span>em
                    </label>
                    <input id="plum-font-size-range" type="range" min="0.90" max="1.40" step="0.02" value="${settings.fontSize}">
                </div>
            </div>
        </div>
    `;

    container.appendChild(wrapper);

    const bgSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('plum-bg-select'));
    const bgDimRange = /** @type {HTMLInputElement | null} */ (document.getElementById('plum-bg-dim-range'));
    const bgDimVal = document.getElementById('plum-bg-dim-val');
    const bgBlurRange = /** @type {HTMLInputElement | null} */ (document.getElementById('plum-bg-blur-range'));
    const bgBlurVal = document.getElementById('plum-bg-blur-val');

    const fontSelect = /** @type {HTMLSelectElement | null} */ (document.getElementById('plum-font-select'));
    const customWrap = document.getElementById('plum-custom-font-wrap');
    const customInput = /** @type {HTMLInputElement | null} */ (document.getElementById('plum-custom-font-input'));
    const sizeRange = /** @type {HTMLInputElement | null} */ (document.getElementById('plum-font-size-range'));
    const sizeVal = document.getElementById('plum-font-size-val');

    if (customInput) {
        customInput.value = settings.customFont;
    }

    bgSelect?.addEventListener('change', () => {
        settings.bgPreset = bgSelect.value;
        applyBackgroundSettings();
        saveSettingsDebounced();
    });

    bgDimRange?.addEventListener('input', () => {
        settings.bgDim = Number(bgDimRange.value);
        if (bgDimVal) {
            bgDimVal.textContent = String(settings.bgDim);
        }
        applyBackgroundSettings();
        saveSettingsDebounced();
    });

    bgBlurRange?.addEventListener('input', () => {
        settings.bgBlur = Number(bgBlurRange.value);
        if (bgBlurVal) {
            bgBlurVal.textContent = String(settings.bgBlur);
        }
        applyBackgroundSettings();
        saveSettingsDebounced();
    });

    fontSelect?.addEventListener('change', () => {
        settings.fontPreset = fontSelect.value;
        if (customWrap) {
            customWrap.style.display = settings.fontPreset === 'custom' ? 'block' : 'none';
        }
        applyThemeSettings();
        saveSettingsDebounced();
    });

    customInput?.addEventListener('input', () => {
        settings.customFont = customInput.value;
        if (customFontTimer) clearTimeout(customFontTimer);
        customFontTimer = setTimeout(() => {
            applyThemeSettings();
            saveSettingsDebounced();
        }, 400);
    });

    sizeRange?.addEventListener('input', () => {
        settings.fontSize = Number(sizeRange.value);
        if (sizeVal) {
            sizeVal.textContent = settings.fontSize.toFixed(2);
        }
        applyThemeSettings();
        saveSettingsDebounced();
    });
}

function init() {
    applyThemeSettings();
    renderSettingsUI();
}

const jq = /** @type {((fn: () => void) => void) | undefined} */ (/** @type {any} */ (globalThis).jQuery);
if (typeof jq === 'function') {
    jq(init);
} else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
