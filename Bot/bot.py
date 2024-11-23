from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, CallbackContext

# Токен бота из BotFather
TOKEN = '7121832503:AAHc1leaq2bqeqStbFinIRyUcpgy52UGDQM'

# Функция для команды /start
async def start(update: Update, context: CallbackContext) -> None:
    # Создаем кнопку с Web App
    keyboard = [
        [
            InlineKeyboardButton(
                "Открыть Mini App",
                web_app={"url": "https://matrixq35.github.io/Minig-app/"}
            )
        ]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Отправляем сообщение с кнопкой
    await update.message.reply_text(
        "Добро пожаловать! Нажмите кнопку ниже, чтобы открыть Mini App:",
        reply_markup=reply_markup
    )

# Основная логика запуска бота
if __name__ == '__main__':
    # Инициализируем приложение
    app = ApplicationBuilder().token(TOKEN).build()

    # Добавляем обработчик команды /start
    app.add_handler(CommandHandler("start", start))

    # Запускаем бота
    print("Бот запущен!")
    app.run_polling()
