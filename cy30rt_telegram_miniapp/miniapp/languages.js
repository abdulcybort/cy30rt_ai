// Complete 15 Language Database
const LANGUAGES = {
    en: { name: "English", native: "English", flag: "🇬🇧", dir: "ltr", code: "en" },
    ha: { name: "Hausa", native: "Hausa", flag: "🇳🇬", dir: "ltr", code: "ha" },
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

// UI Translations
const UI_TEXTS = {
    en: {
        choose_language: "Choose Your Language",
        online: "Online",
        typing: "Cy30rt_AI is thinking...",
        error: "Error occurred. Please try again.",
        warning: "Practice on authorized systems only",
        type_message: "Type a message...",
        learn: "Learn",
        payloads: "Payloads",
        labs: "Labs",
        tutorials: "Tutorials",
        change_language: "Change Language",
        creator_text: "Created by Abdulbasid Yakubu (cy30rt)",
        ai_signature: "NEURAL AI CORE v1.0",
        welcome: "Hello! I'm Cy30rt_AI, your cybersecurity AI assistant.",
        welcome_creator: "Created by Abdulbasid Yakubu (cy30rt), I'm here to help you learn ethical hacking."
    },
    ha: {
        choose_language: "Zaɓi Harshenku",
        online: "Kan layi",
        typing: "Cy30rt_AI yana tunani...",
        error: "Kuskure ya faru. Da fatan za a sake gwadawa.",
        warning: "Yi aiki akan tsarin izini kawai",
        type_message: "Rubuta sako...",
        learn: "Koyo",
        payloads: "Rumbun Payload",
        labs: "Labs",
        tutorials: "Koyarwa",
        change_language: "Canza Harshe",
        creator_text: "Abdulbasid Yakubu (cy30rt) ne ya kirkiro",
        ai_signature: "JIKIN AI v1.0",
        welcome: "Sannu! Ni Cy30rt_AI ne, mataimakin kan tsaro na AI.",
        welcome_creator: "Abdulbasid Yakubu (cy30rt) ne ya kirkiro ni, ina nan don taimaka muku koyon hacking na ɗa'a."
    },
    ar: {
        choose_language: "اختر لغتك",
        online: "متصل",
        typing: "Cy30rt_AI يفكر...",
        error: "حدث خطأ. الرجاء المحاولة مرة أخرى.",
        warning: "تدرب فقط على الأنظمة المصرح بها",
        type_message: "اكتب رسالة...",
        learn: "تعلم",
        payloads: "الحمولات",
        labs: "المختبرات",
        tutorials: "دروس",
        change_language: "تغيير اللغة",
        creator_text: "تم الإنشاء بواسطة عبدالباسد يعقوب (cy30rt)",
        ai_signature: "نواة الذكاء الاصطناعي v1.0",
        welcome: "مرحباً！ أنا Cy30rt_AI، مساعد الأمن السيبراني بالذكاء الاصطناعي.",
        welcome_creator: "تم إنشائي بواسطة عبدالباسد يعقوب (cy30rt)، أنا هنا لمساعدتك في تعلم الاختراق الأخلاقي."
    }
};

let currentLanguage = "en";
let currentDirection = "ltr";

function loadLanguage(langCode) {
    currentLanguage = langCode;
    currentDirection = LANGUAGES[langCode]?.dir || "ltr";
    
    document.body.dir = currentDirection;
    document.documentElement.dir = currentDirection;
    
    const texts = UI_TEXTS[langCode] || UI_TEXTS["en"];
    
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        if (texts[key]) el.textContent = texts[key];
    });
    
    localStorage.setItem("cy30rt_language", langCode);
}

function getCurrentLanguage() {
    return currentLanguage;
}

function renderLanguageGrid() {
    const grid = document.getElementById("languageGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    Object.entries(LANGUAGES).forEach(([code, lang]) => {
        const button = document.createElement("button");
        button.className = "language-item";
        button.onclick = () => selectLanguage(code);
        button.innerHTML = `
            <div class="language-flag">${lang.flag}</div>
            <div class="language-name">${lang.name}</div>
            <div class="language-native">${lang.native}</div>
        `;
        grid.appendChild(button);
    });
}

function selectLanguage(code) {
    currentLanguage = code;
    localStorage.setItem("cy30rt_language", code);
    
    // Hide language screen, show main app
    document.getElementById("languageScreen").classList.remove("active");
    document.getElementById("languageScreen").style.display = "none";
    document.getElementById("mainApp").classList.add("active");
    
    // Update UI text
    const texts = UI_TEXTS[code] || UI_TEXTS["en"];
    document.getElementById("statusText").innerText = texts.online;
    document.getElementById("typingText").innerText = texts.typing;
    document.getElementById("warningText").innerHTML = `⚠️ ${texts.warning}`;
    document.getElementById("messageInput").placeholder = texts.type_message;
    document.getElementById("creatorText").innerHTML = texts.creator_text;
    document.getElementById("ai_signature").innerHTML = `🧠 ${texts.ai_signature}`;
    
    // Update quick action buttons
    document.querySelectorAll("[data-action]").forEach(btn => {
        const action = btn.getAttribute("data-action");
        if (action === "learn") btn.innerHTML = `📚 ${texts.learn}`;
        if (action === "payloads") btn.innerHTML = `💉 ${texts.payloads}`;
        if (action === "labs") btn.innerHTML = `🏴‍☠️ ${texts.labs}`;
        if (action === "tutorials") btn.innerHTML = `📖 ${texts.tutorials}`;
    });
    
    // Update welcome message
    const chatMessages = document.getElementById("chatMessages");
    if (chatMessages) {
        chatMessages.innerHTML = `
            <div class="message ai-message">
                <div class="message-avatar">🤖</div>
                <div class="message-content">
                    <div class="message-text">
                        ${texts.welcome}<br><br>
                        ${texts.welcome_creator}<br><br>
                        How can I help you today?
                    </div>
                    <div class="message-time">Just now</div>
                </div>
            </div>
        `;
    }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
    renderLanguageGrid();
    
    const savedLang = localStorage.getItem("cy30rt_language");
    if (savedLang && LANGUAGES[savedLang]) {
        selectLanguage(savedLang);
    }
});
