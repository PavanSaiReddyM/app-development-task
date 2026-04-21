const express = require('express')
const http = require('http')
const { Server } = require('socket.io')
const path = require('path')
const multer = require('multer')
const sharp = require('sharp')
const fs = require('fs')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path
const db = require('./db')

ffmpeg.setFfmpegPath(ffmpegPath)

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static(path.join(__dirname, 'public')))


const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
})

app.post('/upload', upload.single('image'), async (req, res) => {
    const ext = path.extname(req.file.originalname).toLowerCase()
    const filename = Date.now() + (ext === '.png' ? '.png' : '.jpg')
    const outputPath = path.join(__dirname, 'public/uploads', filename)

    //Edge detection (Sobel) - keep color, no greyscale
    const sobelKernel = {
        width: 3, height: 3,
        kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1]
    }
    const edgeBuffer = await sharp(req.file.buffer)
        .convolve(sobelKernel)
        .toBuffer()

    const blended = await sharp(req.file.buffer)
        .composite([{ input: edgeBuffer, blend: 'multiply' }])
        .toBuffer()

  
    if (ext === '.png') {
        await sharp(blended)
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
            .png({ compressionLevel: 9, effort: 10 })
            .toFile(outputPath)
    } else {
        await sharp(blended)
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.5 })
            .jpeg({ quality: 95, mozjpeg: true })
            .toFile(outputPath)
    }

    res.json({ url: '/uploads/' + filename })
})

// Audio upload — compress to opus 64kbps like WhatsApp
const audioUpload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, 'public/audio'),
        filename: (req, file, cb) => cb(null, 'raw_' + Date.now() + path.extname(file.originalname))
    }),
    limits: { fileSize: 4 * 1024 * 1024 },
    fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('audio/'))
})

app.post('/upload-audio', audioUpload.single('audio'), (req, res) => {
    const inputPath = req.file.path
    const outputFilename = 'audio_' + Date.now() + '.ogg'
    const outputPath = path.join(__dirname, 'public/audio', outputFilename)

    ffmpeg(inputPath)
        .audioCodec('libopus')       
        .audioBitrate('8k')         
        .audioFrequency(48000)       
        .audioChannels(1)           
        .format('ogg')
        .on('end', () => {
            fs.unlinkSync(inputPath) // Remove raw file
            res.json({ url: '/audio/' + outputFilename })
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err)
            res.status(500).json({ error: 'Audio processing failed' })
        })
        .save(outputPath)
})

const users = new Map()

io.on('connection', (socket) => {

    socket.on('join', (name) => {
        users.set(socket.id, name)
        socket.broadcast.emit('user-joined', name)
        io.emit('clients-total', users.size)
    })

    socket.on('message', (data) => {
        // Save to DB only if it's a text message
        if (data.message) {
            db.prepare('INSERT INTO messages (name, message) VALUES (?, ?)').run(data.name, data.message)
        }

        // Broadcast to other users
        socket.broadcast.emit('chat-message', data)

        if (data.message && data.message.trim().toLowerCase().startsWith('/ask')) {
            const question = data.message.trim().slice(4).trim()
            const faq = db.prepare('SELECT answer FROM faqs WHERE LOWER(?) LIKE LOWER(question)').get(question)
            const botMessage = faq ? faq.answer : 'I have no idea what you are talking about!'
            io.to(socket.id).emit('chat-message', { name: 'Bot', message: botMessage, dateTime: new Date() })
        }
    })

    socket.on('feedback', (text) => {
        socket.broadcast.emit('feedback', text)
    })

    socket.on('disconnect', () => {
        const name = users.get(socket.id)
        users.delete(socket.id)
        if (name) socket.broadcast.emit('user-left', name)
        io.emit('clients-total', users.size)
    })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
