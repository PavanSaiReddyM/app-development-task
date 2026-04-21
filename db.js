const Database = require('better-sqlite3')
const db = new Database('chat.db')


db.exec(`
    CREATE TABLE IF NOT EXISTS faqs (
        id INTEGER PRIMARY KEY,
        question TEXT UNIQUE,
        answer TEXT
    );
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`)


const insert = db.prepare('INSERT OR IGNORE INTO faqs (question, answer) VALUES (?, ?)')
const faqs = [
    ['hello',        'Hey there!  Welcome to the chatroom!'],
    ['hi',           'Hi! How are you doing?'],
    ['how are you',  'I am doing great, thanks for asking! '],
    ['help',         'You can type any message to chat. Try saying hello!'],
    ['bye',          'Goodbye!  See you next time!'],
    ['good morning', 'Good morning!  Hope you have a great day!'],
    ['good night',   'Good night!  Sleep well!'],
    ['what is this', 'This is a real-time chatroom built with Node.js and Socket.io!'],
    ['who are you',  'I am a chatroom bot with predefined responses '],
    ['thanks',       'You are welcome! '],
    ['thank you',    'Happy to help! '],
    ['date',          new Date().toLocaleString()]
    
]
faqs.forEach(([q, a]) => insert.run(q, a))

module.exports = db



