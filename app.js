const form = document.getElementById('add-form');
const itemNameInput = document.getElementById('item-name');
const itemQtyInput = document.getElementById('item-qty');
const itemUnitSelect = document.getElementById('item-unit');
const itemDateInput = document.getElementById('item-date');
const listEl = document.getElementById('shopping-list');
const toastEl = document.getElementById('toast');

let items = JSON.parse(localStorage.getItem('shoppingList')) || [];

const TOAST_DURATION = 2500;
const LOADING_DURATION = 600;

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTH_NAMES = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function getToday() {
    return new Date().toISOString().slice(0, 10);
}

function formatDate(dateStr) {
    const d = new Date(dateStr + 'T12:00:00');
    const dayName = DAY_NAMES[d.getDay()];
    const day = d.getDate();
    const month = MONTH_NAMES[d.getMonth()];
    return `${dayName}, ${day} ${month}`;
}

function migrateItems() {
    const today = getToday();
    let changed = false;
    items.forEach(item => {
        if (!item.date) {
            item.date = today;
            changed = true;
        }
    });
    if (changed) saveItems();
}

function showToast(message, type = 'success') {
    toastEl.textContent = message;
    toastEl.className = `toast ${type} visible`;
    clearTimeout(toastEl._timer);
    toastEl._timer = setTimeout(() => {
        toastEl.classList.remove('visible');
    }, type === 'loading' ? LOADING_DURATION : TOAST_DURATION);
}

function adaptInputSize() {
    const len = itemNameInput.value.length;
    itemNameInput.size = Math.max(15, Math.min(len + 1, 31));
}

itemNameInput.addEventListener('input', adaptInputSize);
itemNameInput.addEventListener('focus', adaptInputSize);

function getUniqueDates() {
    const today = getToday();
    const set = new Set();
    items.forEach(item => set.add(item.date || today));
    return Array.from(set).sort().reverse();
}

function renderList() {
    listEl.innerHTML = '';
    migrateItems();

    if (items.length === 0) {
        listEl.innerHTML = '<div class="empty-message">Список пуст. Добавьте товар.</div>';
        return;
    }

    const today = getToday();
    const dates = getUniqueDates();

    dates.forEach(dateStr => {
        const dayItems = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => (item.date || today) === dateStr);

        const purchased = dayItems.filter(({ item }) => item.purchased).length;
        const total = dayItems.length;

        const section = document.createElement('section');
        section.className = 'day-section';
        section.innerHTML = `
            <header class="day-header">
                <h2 class="day-date">${formatDate(dateStr)}</h2>
                <span class="day-stats">куплено ${purchased} из ${total}</span>
            </header>
            <ul class="day-items"></ul>
        `;

        const ul = section.querySelector('.day-items');

        dayItems.forEach(({ item, index }) => {
            const unit = item.unit || 'шт';
            const li = document.createElement('li');
            if (item.purchased) li.classList.add('purchased');
            li.innerHTML = `
                <input type="checkbox" class="purchase-checkbox" ${item.purchased ? 'checked' : ''} data-index="${index}" aria-label="Отметить куплено">
                <span class="item-text">${escapeHtml(item.name)}</span>
                <span class="item-qty">${item.qty} ${unit}</span>
                <button type="button" class="btn btn-delete" data-index="${index}">Удалить</button>
            `;
            ul.appendChild(li);
        });

        listEl.appendChild(section);
    });

    document.querySelectorAll('.purchase-checkbox').forEach(cb => {
        cb.addEventListener('change', () => togglePurchased(parseInt(cb.dataset.index)));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.index)));
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

let isAdding = false;

function addItem(e) {
    e.preventDefault();
    if (isAdding) return;

    const rawName = itemNameInput.value;
    const name = rawName.trim();
    const rawQty = String(itemQtyInput.value).trim();
    const qty = parseInt(itemQtyInput.value, 10);
    const unit = itemUnitSelect.value;
    const date = itemDateInput.value || getToday();

    if (!rawName) {
        showToast('Введите название товара', 'error');
        itemNameInput.focus();
        return;
    }

    if (!name) {
        showToast('Название не может состоять только из пробелов', 'error');
        itemNameInput.focus();
        return;
    }

    if (!rawQty || isNaN(qty) || qty < 1) {
        showToast('Введите корректное количество (не пустое и не только пробелы)', 'error');
        itemQtyInput.focus();
        return;
    }

    isAdding = true;
    showToast('Добавляем...', 'loading');

    setTimeout(() => {
        items.push({ name, qty, unit, date, purchased: false });
        saveItems();
        itemNameInput.value = '';
        itemQtyInput.value = '1';
        itemNameInput.size = 15;
        itemDateInput.value = getToday();
        itemNameInput.focus();
        renderList();
        showToast('Товар добавлен', 'success');
        isAdding = false;
    }, LOADING_DURATION);
}

function togglePurchased(index) {
    items[index].purchased = !items[index].purchased;
    saveItems();
    renderList();
}

function deleteItem(index) {
    const item = items[index];
    if (!confirm(`Удалить «${item.name}» из списка?`)) return;

    showToast('Удаляем...', 'loading');

    setTimeout(() => {
        items.splice(index, 1);
        saveItems();
        renderList();
        showToast('Товар удалён', 'success');
    }, LOADING_DURATION);
}

function saveItems() {
    localStorage.setItem('shoppingList', JSON.stringify(items));
}

itemDateInput.value = getToday();
form.addEventListener('submit', addItem);
adaptInputSize();
renderList();
