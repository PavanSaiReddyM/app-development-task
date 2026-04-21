const socket = io()

const joinScreen = document.getElementById('join-screen')
const chatScreen = document.getElementById('chat-screen')
const nameInput = document.getElementById('nameInput')
const joinButton = document.getElementById('joinButton')
const messages = document.getElementById('messages')
const messageInput = document.getElementById('messageInput')
const sendButton = document.getElementById('sendButton')
const feedback = document.getElementById('feedback')
const headerClients = document.getElementById('header-clients')
const imageInput = document.getElementById('imageInput')
const imageLabel = document.getElementById('imageLabel')
const audioInput = document.getElementById('audioInput')

let myName = ''

function joinRoom() {
    const name = nameInput.value.trim()
    if (!name) return
    myName = name
    socket.emit('join', myName)
    joinScreen.classList.add('hidden')
    chatScreen.classList.remove('hidden')
    messageInput.focus()
}

function sendMessage() {
    const message = messageInput.value.trim()
    if (!message) return
    const data = { name: myName, message, dateTime: new Date() }
    socket.emit('message', data)
    addMessage(true, data)
    messageInput.value = ''
    socket.emit('feedback', '')
}

function addMessage(isOwn, data) {
    const li = document.createElement('li')
    li.classList.add('message', isOwn ? 'own' : 'other')
    let content
    if (data.image) {
        content = `<img src="${data.image}" class="chat-image" onclick="window.open('${data.image}')"/>`
    } else if (data.audio) {
        content = `<audio controls class="chat-audio"><source src="${data.audio}" type="audio/ogg"></audio>`
    } else {
        content = `<span class="bubble">${data.message}</span>`
    }
    li.innerHTML = `
        <div class="meta">
            <span class="name">${data.name}</span>
            <span class="time">${new Date(data.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        ${content}
    `
    messages.appendChild(li)
    messages.parentElement.scrollTop = messages.parentElement.scrollHeight
}

function addSystemMessage(text) {
    const li = document.createElement('li')
    li.classList.add('system-msg')
    li.textContent = text
    messages.appendChild(li)
    messages.parentElement.scrollTop = messages.parentElement.scrollHeight
}

imageInput.addEventListener('change', async () => {
    const file = imageInput.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('image', file)
    const res = await fetch('/upload', { method: 'POST', body: formData })
    const { url } = await res.json()
    const data = { name: myName, image: url, dateTime: new Date() }
    socket.emit('message', data)
    addMessage(true, data)
    imageInput.value = ''
})

audioInput.addEventListener('change', async () => {
    const file = audioInput.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('audio', file)
    const res = await fetch('/upload-audio', { method: 'POST', body: formData })
    const { url } = await res.json()
    const data = { name: myName, audio: url, dateTime: new Date() }
    socket.emit('message', data)
    addMessage(true, data)
    audioInput.value = ''
})

joinButton.addEventListener('click', joinRoom)
nameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') joinRoom() })
sendButton.addEventListener('click', sendMessage)
messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage() })

messageInput.addEventListener('input', () => {
    socket.emit('feedback', messageInput.value ? `${myName} is typing...` : '')
})

socket.on('clients-total', (count) => { headerClients.textContent = count })
socket.on('user-joined', (name) => addSystemMessage(`${name} joined the room`))
socket.on('user-left', (name) => addSystemMessage(`${name} left the room`))
socket.on('chat-message', (data) => addMessage(false, data))
socket.on('feedback', (text) => { feedback.textContent = text })
