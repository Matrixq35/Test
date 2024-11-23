// Подключение к Telegram Web App API
const tg = window.Telegram.WebApp;

// Логика Mini App
tg.ready(); // Telegram WebApp готово к использованию

// Реакция на кнопку "Начать майнинг"
document.getElementById('startMining').addEventListener('click', () => {
    alert('Майнинг запущен!');
    tg.close(); // Закрыть WebApp после выполнения действия
});
