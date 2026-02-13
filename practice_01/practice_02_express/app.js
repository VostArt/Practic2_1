const express = require('express');
const app = express();
const port = 3000;

// Это нужно, чтобы сервер понимал JSON данные, которые мы будем отправлять
app.use(express.json());

// --- БАЗА ДАННЫХ (Простой массив) ---
// В задании сказано: id, название, стоимость
let products = [
    { id: 1, name: 'Ноутбук', price: 50000 },
    { id: 2, name: 'Мышка', price: 1500 },
    { id: 3, name: 'Клавиатура', price: 3000 }
];

// --- МАРШРУТЫ (Запросы) ---

// 1. Главная страница
app.get('/', (req, res) => {
    res.send('<h1>Сервер работает!</h1><p>Перейди на <a href="/products">/products</a>, чтобы увидеть товары.</p>');
});

// 2. Получить ВСЕ товары (GET)
app.get('/products', (req, res) => {
    res.json(products);
});

// 3. Получить ОДИН товар по ID (GET)
app.get('/products/:id', (req, res) => {
    // Находим товар в массиве по ID
    const product = products.find(p => p.id === parseInt(req.params.id));
    
    if (product) {
        res.json(product);
    } else {
        res.status(404).json({ message: 'Товар не найден' });
    }
});

// 4. Добавить товар (POST)
app.post('/products', (req, res) => {
    const { name, price } = req.body;

    // Проверка, что прислали данные
    if (!name || !price) {
        return res.status(400).json({ message: 'Нужно указать name и price' });
    }

    const newProduct = {
        id: Date.now(), // Генерируем уникальный ID
        name,
        price
    };

    products.push(newProduct);
    res.status(201).json(newProduct);
});

// 5. Редактировать товар (PATCH)
app.patch('/products/:id', (req, res) => {
    const product = products.find(p => p.id === parseInt(req.params.id));
    
    if (!product) {
        return res.status(404).json({ message: 'Товар не найден' });
    }

    // Обновляем только те поля, которые пришли
    if (req.body.name) product.name = req.body.name;
    if (req.body.price) product.price = req.body.price;

    res.json(product);
});

// 6. Удалить товар (DELETE)
app.delete('/products/:id', (req, res) => {
    // Оставляем в массиве только те товары, ID которых НЕ совпадает с удаляемым
    const initialLength = products.length;
    products = products.filter(p => p.id !== parseInt(req.params.id));

    if (products.length < initialLength) {
        res.json({ message: 'Товар удален' });
    } else {
        res.status(404).json({ message: 'Товар не найден' });
    }
});

// --- ЗАПУСК ---
app.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});