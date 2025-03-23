const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Получаем строку подключения из переменных окружения
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Функция для генерации случайного баланса от 800 до 17000
function generateRandomBalance() {
  return Math.floor(Math.random() * (17000 - 800 + 1)) + 800;
}

// Функция для генерации случайного имени, если оно не передано
function generateRandomName() {
  const names = ['Аноним', 'Гость', 'Пользователь'];
  return names[Math.floor(Math.random() * names.length)];
}

// Создание таблицы users, если она еще не существует
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    user_id BIGINT PRIMARY KEY,
    balance NUMERIC,
    name TEXT,
    referral_code TEXT UNIQUE,
    referred_by BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
  )
`, (err, result) => {
  if (err) {
    console.error('Ошибка создания таблицы:', err.message);
  } else {
    console.log('Таблица users создана или уже существует.');
  }
});

// Создание таблицы user_tasks, если она еще не существует
pool.query(`
  CREATE TABLE IF NOT EXISTS user_tasks (
    id SERIAL PRIMARY KEY,
    user_id BIGINT,
    task_id TEXT,
    status TEXT, -- например, 'pending', 'claimable', 'completed'
    updated_at TIMESTAMP DEFAULT NOW()
  )
`, (err, result) => {
  if (err) {
    console.error('Ошибка создания таблицы user_tasks:', err.message);
  } else {
    console.log('Таблица user_tasks создана или уже существует.');
  }
});

// Эндпоинт для получения баланса (с обработкой реферального кода и начислением бонуса)
app.post('/getBalance', (req, res) => {
  const userData = req.body;
  const userId = userData.id;
  const userName = userData.name || generateRandomName();
  const refParam = userData.ref; // если пользователь пришёл по реферальной ссылке
  console.log('Полученные данные от клиента:', userData);

  if (!userId) {
    console.error('Некорректные данные:', userData);
    res.status(400).send("Некорректные данные");
    return;
  }

  // Проверяем, существует ли пользователь
  pool.query('SELECT * FROM users WHERE user_id = $1', [userId], (err, result) => {
    if (err) {
      console.error('Ошибка проверки пользователя:', err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }

    if (result.rows.length > 0) {
      // Пользователь уже существует — возвращаем баланс, имя и реферальный код
      const { balance, name, referral_code } = result.rows[0];
      console.log(`Пользователь ${userId} найден. Баланс: ${balance}`);
      res.json({ balance, name, referralCode: referral_code });
    } else {
      // Пользователь новый — генерируем баланс и используем его user_id в качестве referral_code
      const balance = generateRandomBalance();
      const referralCode = userId.toString(); // referral_code равен user_id
      let referredBy = null;

      // Если передан параметр ref, проверяем его корректность и наличие пользователя с таким user_id
      if (refParam) {
        // Предотвращаем ситуацию, когда пользователь указывает себя в качестве реферала
        if (refParam === userId.toString()) {
          console.error('Пользователь не может приглашать самого себя.');
        } else {
          pool.query('SELECT user_id, balance FROM users WHERE user_id = $1', [refParam], (err, refResult) => {
            if (err) {
              console.error('Ошибка проверки ref:', err.message);
              res.status(500).send("Ошибка сервера");
              return;
            }
            if (refResult.rows.length > 0) {
              referredBy = refResult.rows[0].user_id;
              console.log(`Пользователь приглашён через ref ${refParam} от user_id ${referredBy}`);
            } else {
              console.log(`Пользователь с ref ${refParam} не найден.`);
            }
            // Сохраняем нового пользователя с указанным referredBy (если он найден, иначе null)
            pool.query(
              'INSERT INTO users (user_id, balance, name, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5)',
              [userId, balance, userName, referralCode, referredBy],
              (err, insertResult) => {
                if (err) {
                  console.error('Ошибка сохранения нового пользователя:', err.message);
                  res.status(500).send("Ошибка сервера");
                  return;
                }
                // Если найден приглашающий, начисляем бонус (20% от стартового баланса нового пользователя)
                if (referredBy) {
                  const bonus = Math.floor(balance * 0.20);
                  pool.query(
                    'UPDATE users SET balance = balance + $1 WHERE user_id = $2',
                    [bonus, referredBy],
                    (err, bonusResult) => {
                      if (err) {
                        console.error('Ошибка начисления бонуса:', err.message);
                        // Даже если бонус не начислен, возвращаем успешную регистрацию
                      } else {
                        console.log(`Начислен бонус ${bonus} VITS пользователю ${referredBy}`);
                      }
                      res.json({ balance, name: userName, referralCode, bonusAwarded: bonus });
                    }
                  );
                } else {
                  res.json({ balance, name: userName, referralCode });
                }
              }
            );
          });
          return; // Выходим, чтобы не выполнять код ниже
        }
      }

      // Если ref не передан или он некорректный, сохраняем пользователя без referred_by
      pool.query(
        'INSERT INTO users (user_id, balance, name, referral_code, referred_by) VALUES ($1, $2, $3, $4, $5)',
        [userId, balance, userName, referralCode, null],
        (err, result) => {
          if (err) {
            console.error('Ошибка сохранения нового пользователя:', err.message);
            res.status(500).send("Ошибка сервера");
            return;
          }
          res.json({ balance, name: userName, referralCode });
        }
      );
    }
  });
});

// Эндпоинт для получения топ-100 игроков
app.get('/getTopPlayers', (req, res) => {
  pool.query('SELECT * FROM users ORDER BY balance DESC LIMIT 100', (err, result) => {
    if (err) {
      console.error('Ошибка при получении топ-100 игроков:', err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }
    res.json(result.rows);
  });
});

// Эндпоинт для получения позиции пользователя
app.post('/getUserPosition', (req, res) => {
  const userData = req.body;
  const userId = userData.id;
  console.log('Полученные данные от клиента:', userData);
  if (!userId) {
    console.error('Получены некорректные данные от пользователя:', userData);
    res.status(400).send("Некорректные данные");
    return;
  }
  console.log(`Получен запрос на позицию для пользователя с user_id: ${userId}`);
  pool.query(`
      SELECT COUNT(*) + 1 AS position
      FROM users
      WHERE balance > (SELECT balance FROM users WHERE user_id = $1)
  `, [userId], (err, result) => {
    if (err) {
      console.error('Ошибка при получении позиции пользователя:', err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }
    const position = result.rows[0].position;
    console.log(`Позиция пользователя с user_id ${userId}: ${position}`);
    res.json({ position: position });
  });
});

// Эндпоинт для обновления баланса
app.post('/updateBalance', (req, res) => {
  const userData = req.body;
  const userId = userData.id;
  const newBalance = userData.balance;
  console.log('Полученные данные для обновления баланса:', userData);
  if (!userId || newBalance === undefined) {
    console.error('Получены некорректные данные для обновления баланса:', userData);
    res.status(400).send("Некорректные данные");
    return;
  }
  console.log(`Получен запрос на обновление баланса для пользователя с user_id: ${userId}, новый баланс: ${newBalance}`);
  pool.query('UPDATE users SET balance = $1 WHERE user_id = $2', [newBalance, userId], (err, result) => {
    if (err) {
      console.error('Ошибка при обновлении баланса пользователя:', err.message);
      res.status(500).send("Ошибка сервера");
      return;
    }
    if (result.rowCount === 0) {
      console.error('Пользователь с user_id не найден:', userId);
      res.status(404).send("Пользователь не найден");
      return;
    }
    console.log(`Баланс пользователя с user_id ${userId} обновлен: ${newBalance}`);
    res.json({ balance: newBalance });
  });
});

// Эндпоинт для получения приглашённых друзей по user_id пригласившего
app.post('/getReferrals', (req, res) => {
  const { id } = req.body;
  
  if (!id) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }
  
  pool.query(
    'SELECT user_id, name, balance, created_at FROM users WHERE referred_by = $1 ORDER BY created_at DESC',
    [id],
    (err, result) => {
      if (err) {
        console.error('Ошибка получения рефералов:', err.message);
        return res.status(500).send('Ошибка сервера');
      }
      res.json(result.rows);
    }
  );
});

// Эндпоинт для получения выполненных заданий пользователя
app.post('/getCompletedTasks', (req, res) => {
  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'Некорректные данные' });
  }
  pool.query(
    'SELECT task_id FROM user_tasks WHERE user_id = $1 AND status = $2',
    [user_id, 'completed'],
    (err, result) => {
      if (err) {
        console.error('Ошибка получения выполненных заданий:', err.message);
        return res.status(500).send("Ошибка сервера");
      }
      const completedTasks = result.rows.map(row => row.task_id);
      res.json({ completedTasks });
    }
  );
});

// Эндпоинт для подтверждения задания (без проверки подписки)
app.post('/claimTask', (req, res) => {
  const { user_id, task_id } = req.body;
  const reward = 2000;
  pool.query('UPDATE users SET balance = balance + $1 WHERE user_id = $2', [reward, user_id], (err, result) => {
    if (err) {
      console.error('Ошибка начисления награды:', err.message);
      return res.status(500).json({ success: false });
    }
    pool.query('INSERT INTO user_tasks (user_id, task_id, status) VALUES ($1, $2, $3)', [user_id, task_id, 'completed'], (err, result) => {
      if (err) {
        console.error('Ошибка пометки задания как выполненного:', err.message);
        return res.status(500).json({ success: false });
      }
      res.json({ success: true, reward });
    });
  });
});

// ==================== SSE-эндпоинт ====================
// Эндпоинт для push-уведомлений (например, обновление лидерборда)
app.get('/events', (req, res) => {
  // Извлекаем user_id из query-параметров (если передан)
  const user_id = req.query.user_id;

  // Устанавливаем заголовки для SSE
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive"
  });
  res.flushHeaders();

  // Функция отправки обновлений
  const sendUpdates = () => {
    // 1. Отправляем лидерборд
    pool.query('SELECT * FROM users ORDER BY balance DESC LIMIT 100', (err, result) => {
      if (!err) {
        const leaderboard = result.rows;
        res.write(`data: ${JSON.stringify({ type: 'leaderboard', data: leaderboard })}\n\n`);
      }
    });

    // Если указан user_id, отправляем обновления для баланса и позиции
    if (user_id) {
      // Баланс
      pool.query('SELECT balance FROM users WHERE user_id = $1', [user_id], (err, result) => {
        if (!err && result.rows.length > 0) {
          const balance = result.rows[0].balance;
          res.write(`data: ${JSON.stringify({ type: 'balance', data: balance })}\n\n`);
        }
      });
      // Позиция
      pool.query(
        `SELECT COUNT(*) + 1 AS position
         FROM users
         WHERE balance > (SELECT balance FROM users WHERE user_id = $1)`,
        [user_id],
        (err, result) => {
          if (!err && result.rows.length > 0) {
            const position = result.rows[0].position;
            res.write(`data: ${JSON.stringify({ type: 'position', data: position })}\n\n`);
          }
        }
      );
    }
  };

  // Отправляем начальные данные
  sendUpdates();
  // Отправляем обновления каждые 2 секунды
  const intervalId = setInterval(sendUpdates, 2000);

  // При закрытии соединения очищаем интервал
  req.on('close', () => {
    clearInterval(intervalId);
    res.end();
  });
});

// =====================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
