const LANGUAGES = {
    en: { name: "English", native: "English", flag: "🇬🇧", dir: "ltr", code: "en" },
    ha: { name: "Hausa", native: "Hausa", flag: "🇳🇬", dir: "ltr", code: "ha" },
    yo: { name: "Yoruba", native: "Yorùbá", flag: "🇳🇬", dir: "ltr", code: "yo" },
    ig: { name: "Igbo", native: "Igbo", flag: "🇳🇬", dir: "ltr", code: "ig" },
    ar: { name: "Arabic", native: "العربية", flag: "🇸🇦", dir: "rtl", code: "ar" },
    es: { name: "Spanish", native: "Español", flag: "🇪🇸", dir: "ltr", code: "es" },
    fr: { name: "French", native: "Français", flag: "🇫🇷", dir: "ltr", code: "fr" },
    de: { name: "German", native: "Deutsch", flag: "🇩🇪", dir: "ltr", code: "de" },
    pt: { name: "Portuguese", native: "Português", flag: "🇵🇹", dir: "ltr", code: "pt" },
    ru: { name: "Russian", native: "Русский", flag: "🇷🇺", dir: "ltr", code: "ru" },
    zh: { name: "Chinese", native: "简体中文", flag: "🇨🇳", dir: "ltr", code: "zh" },
    ja: { name: "Japanese", native: "日本語", flag: "🇯🇵", dir: "ltr", code: "ja" },
    ko: { name: "Korean", native: "한국어", flag: "🇰🇷", dir: "ltr", code: "ko" },
    hi: { name: "Hindi", native: "हिन्दी", flag: "🇮🇳", dir: "ltr", code: "hi" },
    tr: { name: "Turkish", native: "Türkçe", flag: "🇹🇷", dir: "ltr", code: "tr" },
    fa: { name: "Persian", native: "فارسی", flag: "🇮🇷", dir: "rtl", code: "fa" },
    ur: { name: "Urdu", native: "اردو", flag: "🇵🇰", dir: "rtl", code: "ur" }
};

const UI_TEXTS = {
    en: { online: "Operational", typing: "Cy30rt_AI is thinking", n_atlas: "🇳🇬 N-ATLAS Enabled" },
    ha: { online: "Kan layi", typing: "Cy30rt_AI yana tunani", n_atlas: "🇳🇬 N-ATLAS Kunna" },
    yo: { online: "Nṣiṣẹ", typing: "Cy30rt_AI n ronu", n_atlas: "🇳🇬 N-ATLAS Ṣiṣẹ" },
    ig: { online: "Na-arụ ọrụ", typing: "Cy30rt_AI na-eche echiche", n_atlas: "🇳🇬 N-ATLAS Gbanyere" },
    ar: { online: "متصل", typing: "Cy30rt_AI يفكر", n_atlas: "🇳🇬 تم تمكين N-ATLAS" }
};

let currentLanguage = "en";

function renderLanguageGrid() {
    const grid = document.getElementById("languageModalGrid");
    if (!grid) return;
    grid.innerHTML = "";
    grid.className = "language-grid";
    Object.entries(LANGUAGES).forEach(([code, lang]) => {
        const btn = document.createElement("div");
        btn.className = "language-item";
        btn.onclick = () => selectLanguage(code);
        btn.innerHTML = `
            <div class="language-flag">${lang.flag}</div>
            <div class="language-name">${lang.name}</div>
            <div class="language-native">${lang.native}</div>
        `;
        grid.appendChild(btn);
    });
}

function selectLanguage(code) {
    currentLanguage = code;
    localStorage.setItem("cy30rt_language", code);
    document.getElementById("languageScreen").style.display = "none";
    document.getElementById("mainApp").classList.add("active");
    if (typeof changeLanguage === "function") changeLanguage(code);
}

document.addEventListener("DOMContentLoaded", () => {
    renderLanguageGrid();
    const saved = localStorage.getItem("cy30rt_language");
    if (saved && LANGUAGES[saved]) selectLanguage(saved);
});
