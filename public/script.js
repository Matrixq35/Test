document.addEventListener("DOMContentLoaded", () => {
  // Инициализация Telegram WebApp
  window.Telegram.WebApp.ready();
  window.Telegram.WebApp.expand(); // Развернуть приложение на весь экран

  // Функционал переключения экранов и контента
  const navButtons = document.querySelectorAll('.bottom-nav button');
  const screens = document.querySelectorAll('.screen');

  function setActiveScreen(button) {
    navButtons.forEach(btn => {
      btn.classList.remove('active');
      const img = btn.querySelector('.nav-icon img');
      if (img) {
        img.src = img.dataset.default;
      }
    });
    button.classList.add('active');
    const img = button.querySelector('.nav-icon img');
    if (img) {
      img.src = img.dataset.active;
    }
    const targetId = button.getAttribute('data-target');
    screens.forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(targetId);
    if (targetScreen) {
      targetScreen.classList.add('active');
    }
  }

  const defaultButton = document.querySelector('.bottom-nav button.active');
  if (defaultButton) {
    setActiveScreen(defaultButton);
  }
  navButtons.forEach(button => {
    button.addEventListener('click', () => setActiveScreen(button));
  });

  // Переключение контента внутри TASKS SCREEN
  const myButton = document.querySelector('.screen-task-button-my');
  const partnersButton = document.querySelector('.screen-task-button-pathers');
  const tasksContainer = document.getElementById('tasks-my'); // контейнер для "Наших заданий"
  const tasksPartners = document.getElementById('tasks-partners');
  if (myButton && partnersButton && tasksContainer && tasksPartners) {
    myButton.addEventListener('click', function () {
      if (!myButton.classList.contains('active')) {
        myButton.classList.add('active');
        partnersButton.classList.remove('active');
        tasksContainer.style.display = 'flex';
        tasksPartners.style.display = 'none';
      }
    });
    partnersButton.addEventListener('click', function () {
      if (!partnersButton.classList.contains('active')) {
        partnersButton.classList.add('active');
        myButton.classList.remove('active');
        tasksContainer.style.display = 'none';
        tasksPartners.style.display = 'flex';
      }
    });
  }

  // Получаем данные пользователя из Telegram WebApp
  const tgData = window.Telegram.WebApp.initDataUnsafe;
  const user_id = tgData.user.id;
  const user_name = tgData.user.first_name || 'Гость';

  // Считываем параметр реферала
  let refParam = null;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('ref')) {
    refParam = urlParams.get('ref');
  } else if (tgData.start_param) {
    if (tgData.start_param.startsWith('ref_')) {
      refParam = tgData.start_param.replace('ref_', '');
    } else {
      refParam = tgData.start_param;
    }
  }

  // Пример массива заданий. При необходимости добавьте другие объекты.
  const tasks = [
    {
      id: 'subscribe_channel',
      title: 'Подписаться на тг канал проекта',
      reward: 2000,
      url: 'https://t.me/VITS333', // замените на реальную ссылку вашего канала
      imgSrc: 'https://i.ibb.co/tw5g2gcy/image.gif',
      imgAlt: 'Иконка'
    },
    {
      id: 'subscribe_x',
      title: 'x.com',
      reward: 3000,
      url: 'https://x.com/elonmusk?ref_src=twsrc%5Egoogle%7Ctwcamp%5Eserp%7Ctwgr%5Eauthor',
      imgSrc: 'https://i.ibb.co/tw5g2gcy/image.gif',
      imgAlt: 'Иконка'
    }
    // можно добавить другие задания
  ];

  // Объект для хранения статуса заданий (pending или claimable)
  const taskStatus = {};
  // Инициализируем taskStatus из localStorage
  tasks.forEach(task => {
    const savedStatus = localStorage.getItem(`taskStatus_${task.id}`);
    taskStatus[task.id] = savedStatus ? savedStatus : 'pending';
  });

  // Функция для динамического создания карточки задания в заданном формате
  function renderTask(task, status) {
    const container = document.getElementById('tasks-my');
    if (!container) {
      console.error('Контейнер с id "tasks-my" не найден в DOM.');
      return;
    }

    // Создаем основной элемент карточки
    const card = document.createElement('div');
    card.className = 'card-task';
    card.setAttribute('data-task-id', task.id);

    // Левая группа: изображение и текст задания
    const leftGroup = document.createElement('div');
    leftGroup.className = 'left-group-task-card';

    const imgCard = document.createElement('div');
    imgCard.className = 'img-card';

    const img = document.createElement('img');
    img.className = 'img-card-tasks';
    img.src = task.imgSrc || 'https://i.ibb.co/tw5g2gcy/image.gif';
    img.alt = task.imgAlt || 'Иконка';
    imgCard.appendChild(img);

    const textTasksCard = document.createElement('div');
    textTasksCard.className = 'text-tasks-card';

    const spanTitle = document.createElement('span');
    spanTitle.textContent = task.title || 'Без названия';

    const spanReward = document.createElement('span');
    spanReward.textContent = `+${task.reward.toLocaleString('ru-RU')} VITS`;

    textTasksCard.appendChild(spanTitle);
    textTasksCard.appendChild(spanReward);

    leftGroup.appendChild(imgCard);
    leftGroup.appendChild(textTasksCard);

    // Правая группа: кнопка действия
    const rightGroup = document.createElement('div');
    rightGroup.className = 'right-group-tasks-card';

    const btn = document.createElement('button');
    btn.className = 'button-tasks-go';
    btn.textContent = status === 'claimable' ? 'Claim' : 'Открыть';

    btn.addEventListener('click', () => {
      if (taskStatus[task.id] === 'pending') {
        // Открываем задание через Telegram.WebApp.openLink (корректно для ПК и мобильных)
        window.Telegram.WebApp.openLink(task.url);
        // Сохраняем статус в объекте и в localStorage
        taskStatus[task.id] = 'claimable';
        localStorage.setItem(`taskStatus_${task.id}`, 'claimable');
        btn.textContent = 'Claim';
      } else if (taskStatus[task.id] === 'claimable') {
        // Вызываем функцию подтверждения задания
        claimTask(task.id);
      }
    });

    rightGroup.appendChild(btn);

    // Собираем карточку и добавляем в контейнер
    card.appendChild(leftGroup);
    card.appendChild(rightGroup);
    container.appendChild(card);
  }

  // Функция для удаления карточки задания из DOM и из localStorage
  function removeTaskCard(taskId) {
    const card = document.querySelector(`.card-task[data-task-id="${taskId}"]`);
    if (card) {
      card.remove();
    }
    delete taskStatus[taskId];
    localStorage.removeItem(`taskStatus_${taskId}`);
  }

  // Функция для подтверждения задания: отправляет запрос на сервер
  function claimTask(taskId) {
    fetch('/claimTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, task_id: taskId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          removeTaskCard(taskId);
          // Здесь можно обновить баланс на UI, если нужно
        } else {
          alert('Не удалось подтвердить выполнение задания.');
        }
      })
      .catch(err => {
        console.error('Ошибка при подтверждении задания', err);
        alert('Ошибка при обработке запроса.');
      });
  }

  // Функция для отрисовки заданий: сначала запрашиваем выполненные задания,
  // затем фильтруем массив tasks и отрисовываем только невыполненные.
  function renderTasks() {
    fetch('https://vits-vits.up.railway.app/getCompletedTasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id })
    })
      .then(res => res.json())
      .then(data => {
        const completedTasks = data.completedTasks || [];
        // Очищаем контейнер заданий (контейнер "tasks-my" находится внутри общего блока "tasks-body")
        const container = document.getElementById("tasks-my");
        if (container) container.innerHTML = "";
        tasks.forEach(task => {
          if (!completedTasks.includes(task.id)) {
            // Если в localStorage уже есть статус, используем его, иначе "pending"
            const status = localStorage.getItem(`taskStatus_${task.id}`) || 'pending';
            taskStatus[task.id] = status;
            renderTask(task, status);
          }
        });
      })
      .catch(err => {
        console.error('Ошибка при получении выполненных заданий', err);
        // Если ошибка, отрисовываем все задания
        tasks.forEach(task => {
          taskStatus[task.id] = 'pending';
          renderTask(task, 'pending');
        });
      });
  }

  // Отрисовываем задания при загрузке
  renderTasks();

  // При возвращении фокуса обновляем состояние кнопок и список заданий (чтобы убрать выполненные)
  window.addEventListener("focus", () => {
    const cards = document.querySelectorAll(".card-task");
    cards.forEach(card => {
      const taskId = card.getAttribute("data-task-id");
      const btn = card.querySelector("button.button-tasks-go");
      if (btn && taskStatus[taskId] === "claimable") {
        btn.textContent = "Claim";
      }
    });
    // Обновляем список заданий
    renderTasks();
  });

  // SSE: подключаемся к серверу для push-уведомлений (например, обновление лидерборда)
  const evtSource = new EventSource('https://vits-vits.up.railway.app/events');
  evtSource.onmessage = function(e) {
    try {
      const eventData = JSON.parse(e.data);
      switch(eventData.type) {
        case 'leaderboard':
          updateLeaderboardUI(eventData.data);
          break;
        case 'balance':
          updateBalanceUI(eventData.data);
          break;
        case 'position':
          updatePositionUI(eventData.data);
          break;
        default:
          console.warn("Неизвестный тип события SSE:", eventData.type);
      }
    } catch (err) {
      console.error('Ошибка при обработке SSE события:', err);
    }
  };

  // Функция обновления UI для лидерборда
  function updateLeaderboardUI(players) {
    const allTopContainer = document.querySelector('.all-top-container');
    if (!allTopContainer) return;

    allTopContainer.innerHTML = '';
    let userPosition = -1;

    players.forEach((player, index) => {
      const playerName = player.name || 'Гость';

      // Определяем классы по позиции
      const classMap = [
        {
          card: 'card-top-one',
          position: '№1-position',
          name: 'name-card-top-1',
          balance: 'top-card-balance-1',
        },
        {
          card: 'card-top-two',
          position: '№2-position',
          name: 'name-card-top-2',
          balance: 'top-card-balance-2',
        },
        {
          card: 'card-top-three',
          position: '№3-position',
          name: 'name-card-top-3',
          balance: 'top-card-balance-3',
        }
      ];

      const defaultClass = {
        card: 'card-top',
        position: '№-position',
        name: 'name-card-top',
        balance: 'top-card-balance',
      };

      const styles = classMap[index] || defaultClass;

      const card = document.createElement('div');
      card.className = styles.card;
      card.innerHTML = `
        <div class="left-group-top">
          <span class="${styles.position}">${index + 1}. </span>
          <span class="${styles.name}">${playerName}</span>
        </div>
        <div class="right-group-top">
          <div class="${styles.balance}">
            <span class="card-top-balance-text">#${Number(player.balance).toLocaleString('ru-RU')}</span>
          </div>
        </div>
      `;

      allTopContainer.appendChild(card);

      if (player.user_id === user_id) {
        userPosition = index + 1;
      }
    });

    // Возвращаем позицию пользователя, если нужно
    return userPosition;
  }

  // Функция обновления UI для баланса
  function updateBalanceUI(balance) {
    const balanceElem = document.querySelector('.balance-number');
    if (balanceElem) {
      balanceElem.textContent = Number(balance).toLocaleString('ru-RU');
    }
  }

  // Функция обновления UI для позиции пользователя
  function updatePositionUI(position) {
    const myCardContainer = document.querySelector('.my-card-container');
    if (myCardContainer) {
      // Предполагаем, что в my-card-container есть элемент с классом "my-position"
      const posElem = myCardContainer.querySelector('.my-position');
      if (posElem) {
        posElem.textContent = `${position}. `;
      }
    }
  }

  // Остальная логика работы с пользователем (баланс, топ-игроки, рефералы и т.д.)
  if (!user_id) {
    console.error('Некорректные данные пользователя:', user_id);
    alert('Не удалось получить данные пользователя.');
  } else {
    const payload = { id: user_id, name: user_name };
    if (refParam) {
      payload.ref = refParam;
    }

    // Запрос для регистрации/получения баланса
    fetch('https://vits-vits.up.railway.app/getBalance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка сети');
        }
        return response.json();
      })
      .then(data => {
        console.log('Получен баланс от сервера:', data);
        const balanceElem = document.querySelector('.balance-number');
        if (balanceElem) {
          balanceElem.textContent = Number(data.balance).toLocaleString('ru-RU');
        }
        window.myReferralCode = data.referralCode;
        return data;
      })
      .then(userData => {
        // Получаем топ-100 игроков
        fetch('https://vits-vits.up.railway.app/getTopPlayers')
          .then(response => {
            if (!response.ok) {
              throw new Error('Ошибка сети');
            }
            return response.json();
          })
          .then(players => {
            const allTopContainer = document.querySelector('.all-top-container');
            if (allTopContainer) {
              allTopContainer.innerHTML = "";
            }
            let userPosition = -1;
            players.forEach((player, index) => {
              let cardClass, positionClass, nameClass, balanceClass;
              if (index === 0) {
                cardClass = 'card-top-one';
                positionClass = '№1-position';
                nameClass = 'name-card-top-1';
                balanceClass = 'top-card-balance-1';
              } else if (index === 1) {
                cardClass = 'card-top-two';
                positionClass = '№2-position';
                nameClass = 'name-card-top-2';
                balanceClass = 'top-card-balance-2';
              } else if (index === 2) {
                cardClass = 'card-top-three';
                positionClass = '№3-position';
                nameClass = 'name-card-top-3';
                balanceClass = 'top-card-balance-3';
              } else {
                cardClass = 'card-top';
                positionClass = '№-position';
                nameClass = 'name-card-top';
                balanceClass = 'top-card-balance';
              }
              const playerName = player.name || 'Гость';
              const card = document.createElement('div');
              card.className = cardClass;
              card.innerHTML = `
                <div class="left-group-top">
                  <span class="${positionClass}">${index + 1}. </span>
                  <span class="${nameClass}">${playerName}</span>
                </div>
                <div class="right-group-top">
                  <div class="${balanceClass}">
                    <span class="card-top-balance-text">#${Number(player.balance).toLocaleString('ru-RU')}</span>
                  </div>
                </div>
              `;
              if (allTopContainer) {
                allTopContainer.appendChild(card);
              }
              if (player.user_id === user_id) {
                userPosition = index + 1;
              }
            });
          
            // Получаем позицию пользователя среди всех
            fetch('https://vits-vits.up.railway.app/getUserPosition', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: user_id })
            })
              .then(response => {
                if (!response.ok) {
                  throw new Error('Ошибка сети');
                }
                return response.json();
              })
              .then(data => {
                const globalPosition = data.position;
                const myCardContainer = document.querySelector('.my-card-container');
                if (myCardContainer) {
                  myCardContainer.innerHTML = `
                    <div class="left-group-top">
                      <span class="my-position">${globalPosition}. </span>
                      <span class="my-name-top">${user_name}</span>
                    </div>
                    <div class="right-group">
                      <div class="my-top-balance">
                        <span class="my-top-balance-text">#${Number(userData.balance).toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                  `;
                }
              })
              .catch(error => {
                console.error('Ошибка при получении позиции пользователя:', error);
                alert('Не удалось получить позицию пользователя.');
              });
          })
          .catch(error => {
            console.error('Ошибка при получении топ-100 игроков:', error);
            alert('Не удалось получить топ-100 игроков.');
          });
      })
      .catch(error => {
        console.error('Ошибка при получении баланса:', error);
        alert('Не удалось получить баланс.');
      });

    // Запрос списка рефералов
    fetch('https://vits-vits.up.railway.app/getReferrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: user_id })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Ошибка сети');
        }
        return response.json();
      })
      .then(referrals => {
        const referralsContainer = document.querySelector('.container-friends');
        if (referralsContainer) {
          referralsContainer.innerHTML = '';
          if (referrals.length === 0) {
            referralsContainer.innerHTML = '<p style="color: #fff;">Пока нет приглашённых друзей.</p>';
          } else {
            referrals.forEach((ref, index) => {
              const bonusFromReferral = Math.floor(Number(ref.balance) * 0.20);
              referralsContainer.innerHTML += `
                <div class="card-friends">
                  <div class="left-group-friends">
                    <span class="friend-index">${index + 1}. </span>
                    <span class="friend-name">${ref.name || 'Гость'}</span>
                  </div>
                  <div class="right-group-friends">
                    <span class="friend-bonus">+${bonusFromReferral.toLocaleString('ru-RU')} VITS</span>
                  </div>
                </div>
              `;
            });
          }
        }
      })
      .catch(error => {
        console.error('Ошибка при получении рефералов:', error);
        alert('Не удалось получить рефералов.');
      });

    // Обработчик для кнопки «Реферальная ссылка»
    const buttonFriends = document.querySelector('.button-friends');
    if (buttonFriends) {
      buttonFriends.addEventListener('click', () => {
        if (user_id) {
          const referralLink = `https://t.me/Testdesignrobot?startapp=ref_${user_id}`;
          navigator.clipboard.writeText(referralLink)
            .then(() => {
              alert('Реферальная ссылка скопирована: ' + referralLink);
            })
            .catch(err => {
              console.error('Ошибка при копировании ссылки:', err);
              alert('Не удалось скопировать ссылку.');
            });
        } else {
          alert('Нет данных пользователя для генерации реферальной ссылки.');
        }
      });
    }
  }
});
