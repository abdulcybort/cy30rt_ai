import os
import json
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
APP_URL = os.getenv("APP_URL", "https://your-domain.com")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Send welcome message with Mini App button"""
    
    keyboard = [
        [InlineKeyboardButton(
            "🚀 Launch Cy30rt_AI Mini App",
            web_app=WebAppInfo(url=f"{APP_URL}/miniapp")
        )],
        [InlineKeyboardButton("📚 Commands", callback_data="commands")],
        [InlineKeyboardButton("🌐 About Creator", callback_data="about")]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(
        f"""🤖 **Welcome to Cy30rt_AI**

Created by **Abdulbasid Yakubu (cy30rt)** - Cybersecurity Professional

**Your AI-Powered Cybersecurity Teaching Assistant**

✨ **Features:**
• 15 Languages (English, Hausa, Arabic, +12 more)
• 🎤 Voice Input
• 💉 Payload Database
• 📚 Learning Modules
• 🏴‍☠️ Lab Recommendations
• 🤖 AI Q&A

**Click the button below to open the Mini App!**

⚠️ *Always practice on authorized systems only*""",
        reply_markup=reply_markup,
        parse_mode='Markdown'
    )

async def mini_app_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle data from Mini App"""
    data = json.loads(update.message.web_app_data.data)
    await update.message.reply_text(f"Received: {data}")

async def button_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "commands":
        await query.edit_message_text(
            "📚 **Cy30rt_AI Commands**\n\n"
            "/start - Restart the bot\n"
            "/help - Show this help\n"
            "/about - About the creator\n\n"
            "Or use the Mini App for full experience!",
            parse_mode='Markdown'
        )
    elif query.data == "about":
        await query.edit_message_text(
            "👨‍💻 **About the Creator**\n\n"
            "**Abdulbasid Yakubu (cy30rt)**\n"
            "Cybersecurity Professional & Educator\n\n"
            "Passionate about making cybersecurity education accessible to everyone, regardless of language or background.\n\n"
            "🌐 GitHub: @cy30rt\n"
            "📧 Email: abdulbasid@cy30rt.com",
            parse_mode='Markdown'
        )

def main():
    app = Application.builder().token(TELEGRAM_TOKEN).build()
    
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CallbackQueryHandler(button_handler))
    
    print("🤖 Cy30rt_AI Telegram Bot is running!")
    print(f"Created by Abdulbasid Yakubu (cy30rt)")
    
    app.run_polling()

if __name__ == "__main__":
    main()