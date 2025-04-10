
const firebaseConfig = {
    apiKey: "AIzaSyC3-AVdYuhhJVW2JNZE3sUJX6Y9YpWWSHg",
    authDomain: "photo-coin-bot.firebaseapp.com",
    databaseURL: "https://photo-coin-bot-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "photo-coin-bot",
    storageBucket: "photo-coin-bot.firebasestorage.app",
    messagingSenderId: "502991637951",
    appId: "1:502991637951:web:d4b03b4393d4f8ccb8250a",
    measurementId: "G-JRCW8RDB1V"
};

// Инициализируем Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Переменные
let score = 0;
let timeLeft = 30;
let timer;
let correctAnswer;
let difficulty = 1;
let digits = 1;
let isGameRunning = false;
let bestScore = 0;
let gamesPlayed = 0;
let tokens = 0;

// Telegram WebApp
const tg = window.Telegram.WebApp;
tg.expand();

// Элементы DOM
const startButton = document.getElementById('startButton');
const settingsButton = document.getElementById('settingsButton');
const difficultySelect = document.getElementById('difficulty');
const digitsSelect = document.getElementById('digits');
const settingsMenu = document.getElementById('settings-menu');
const accountMenu = document.getElementById('account-menu');
const userName = document.getElementById('name');

// Устанавливаем имя пользователя из Telegram
userName.innerText = tg.initDataUnsafe.first_name || "Игрок";

// Функции
function generateProblem() {
    const operations = ['+', '-', '*', '/'];
    const operation = operations[Math.floor(Math.random() * 4)];
    let num1, num2;
    const maxNum = Math.pow(10, parseInt(digits)) - 1;

    num1 = Math.floor(Math.random() * maxNum);
    num2 = Math.floor(Math.random() * maxNum);

    if (operation === '*') {
        num1 = Math.min(num1, 12);
        num2 = Math.min(num2, 12);
    } else if (operation === '/') {
        num2 = Math.max(1, Math.floor(Math.random() * 9) + 1);
        num1 = num2 * Math.floor(Math.random() * 10);
    }

    document.getElementById('problem').textContent = `${num1} ${operation} ${num2} = `;
    
    switch(operation) {
        case '+': correctAnswer = num1 + num2; break;
        case '-': correctAnswer = num1 - num2; break;
        case '*': correctAnswer = num1 * num2; break;
        case '/': correctAnswer = num1 / num2; break;
    }
}

function calculatePoints() {
    const basePoints = parseInt(difficulty) * parseInt(digits);
    const operation = document.getElementById('problem').textContent.split(' ')[1];
    return (operation === '*' || operation === '/') ? basePoints * 2 : basePoints;
}

function startGame() {
    if (isGameRunning) return;

    score = 0;
    timeLeft = 30;
    difficulty = difficultySelect.value;
    digits = digitsSelect.value;
    isGameRunning = true;
    startButton.disabled = true;
    settingsButton.disabled = true;

    document.getElementById('score').textContent = `Очки: ${score}`;
    document.getElementById('timer').textContent = `Время: ${timeLeft}`;
    
    clearInterval(timer);
    const timerSpeed = 1000 - (difficulty - 1) * 250;
    timer = setInterval(updateTimer, timerSpeed);
    generateProblem();
    document.getElementById('answer').value = '';
    document.getElementById('answer').focus();
    gamesPlayed++;
}

function updateTimer() {
    timeLeft--;
    document.getElementById('timer').textContent = `Время: ${timeLeft}`;
    if (timeLeft <= 0) {
        clearInterval(timer);
        isGameRunning = false;
        startButton.disabled = false;
        settingsButton.disabled = false;
        bestScore = Math.max(bestScore, score);
        document.getElementById('bestScore').textContent = bestScore;
        document.getElementById('gamesPlayed').textContent = gamesPlayed;

        // Асинхронно обновляем токены
        const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 'anonymous';
        database.ref(`users/${userId}/tokens`).once('value', (snapshot) => {
            tokens = snapshot.val() || 0;
            tokens += score * 0.2;
            database.ref(`users/${userId}`).set({
                tokens: tokens,
                bestScore: bestScore,
                gamesPlayed: gamesPlayed,
                firstName: tg.initDataUnsafe.first_name || "Игрок"
            });
            document.getElementById('tokens').textContent = tokens.toFixed(1);
        });

        alert(`Игра окончена! Ваш счёт: ${score}`);
    }
}

function toggleSettings() {
    settingsMenu.style.display = settingsMenu.style.display === 'block' ? 'none' : 'block';
    accountMenu.style.display = 'none';
}

function toggleAccount() {
    accountMenu.style.display = accountMenu.style.display === 'block' ? 'none' : 'block';
    settingsMenu.style.display = 'none';
    const userId = tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 'anonymous';
    database.ref(`users/${userId}`).once('value', (snapshot) => {
        const data = snapshot.val() || {};
        bestScore = data.bestScore || 0;
        gamesPlayed = data.gamesPlayed || 0;
        tokens = data.tokens || 0;
        document.getElementById('bestScore').textContent = bestScore;
        document.getElementById('gamesPlayed').textContent = gamesPlayed;
        document.getElementById('tokens').textContent = tokens.toFixed(1);
    });
}


startButton.addEventListener('click', startGame);
settingsButton.addEventListener('click', toggleSettings);
accountButton.addEventListener('click', toggleAccount);
closeSettings.addEventListener('click', toggleSettings);
closeAccount.addEventListener('click', toggleAccount);


// Обработчики событий
document.getElementById('answer').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && isGameRunning) {
        const userAnswer = parseFloat(this.value);
        if (userAnswer === correctAnswer) {
            score += calculatePoints();
            document.getElementById('score').textContent = `Очки: ${score}`;
        }
        this.value = '';
        generateProblem();
    }
});

difficultySelect.addEventListener('change', function() {
    difficulty = this.value;
});

digitsSelect.addEventListener('change', function() {
    digits = this.value;
});

// Начальная генерация задачи
generateProblem();