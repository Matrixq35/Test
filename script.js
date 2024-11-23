document.getElementById('getTokensForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Останавливаем стандартное отправление формы

    // Получаем введенное имя пользователя
    const username = document.getElementById('username').value;
    const statusMessage = document.getElementById('statusMessage');
    
    if (username) {
        // Допустим, мы отправляем запрос на сервер или выполняем логику токенов
        statusMessage.textContent = `Привет, ${username}! Токены были начислены.`;
        document.getElementById('tokenBalance').textContent = 10;  // Пример, обновляем баланс токенов
    } else {
        statusMessage.textContent = 'Пожалуйста, введите ваше имя.';
    }
});

// Пример кнопки для получения дополнительных токенов
document.getElementById('getMoreTokens').addEventListener('click', function() {
    const currentBalance = parseInt(document.getElementById('tokenBalance').textContent, 10);
    const newBalance = currentBalance + 5;
    document.getElementById('tokenBalance').textContent = newBalance;
    alert('Вы получили дополнительные токены!');
});
