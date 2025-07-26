const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const path = require('path');

const app = express();

// Puerto para Render (importante: usar process.env.PORT)
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Directorio para sesiones (Render permite /tmp)
const SESSION_DIR = process.env.RENDER ? '/tmp/sessions' : './sessions';

// Cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-service',
        dataPath: SESSION_DIR
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Variables para almacenar QR y estado
let qrCodeData = '';
let isConnected = false;

// Eventos de WhatsApp
client.on('qr', (qr) => {
    console.log('=== ESCANEA ESTE CÓDIGO QR ===');
    qrcode.generate(qr, { small: true });
    qrCodeData = qr;
    console.log('==============================');
});

client.on('ready', () => {
    isConnected = true;
    console.log('✅ WhatsApp conectado exitosamente!');
    qrCodeData = '';
});

client.on('disconnected', (reason) => {
    console.log(' WhatsApp desconectado:', reason);
    isConnected = false;
    // Intentar reconectar
    client.initialize();
});

client.on('message', async (message) => {
    console.log('Mensaje recibido:', message.body);

    // Auto-respuesta simple
    if (message.body === '!ping') {
        client.sendMessage(message.from, 'pong! 🏓');
    }
});

// Iniciar cliente
client.initialize();

// Rutas API
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Service API - Render',
        status: isConnected ? 'connected' : 'connecting',
        timestamp: new Date().toISOString()
    });
});

// En el endpoint /qr, modificar para devolver URL de imagen:
app.get('/qr', (req, res) => {
    if (isConnected) {
        return res.json({
            status: 'connected',
            message: 'WhatsApp ya está conectado'
        });
    }

    if (qrCodeData) {
        // Convertir QR data a URL de imagen
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeData)}&size=300x300`;
        res.json({
            status: 'pending',
            qr: qrImageUrl,  // URL de imagen en lugar de texto QR
            message: 'Escanea este código QR con WhatsApp'
        });
    } else {
        res.json({
            status: 'waiting',
            message: 'Esperando código QR...'
        });
    }
});

// Endpoint para enviar mensaje
app.post('/send-message', async (req, res) => {
    try {
        if (!isConnected) {
            return res.status(503).json({
                success: false,
                error: 'WhatsApp no está conectado. Espera a que se conecte.'
            });
        }

        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }

        const chatId = `${phoneNumber}@c.us`;
        const result = await client.sendMessage(chatId, message);

        res.json({
            success: true,
            messageId: result.id._serialized,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint para verificar estado
app.get('/status', (req, res) => {
    res.json({
        connected: isConnected,
        service: 'WhatsApp Service',
        platform: client.info?.platform,
        pushname: client.info?.pushname,
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor WhatsApp corriendo en puerto ${PORT}`);
    console.log(`📱 Accede a /qr para obtener el código QR`);
    console.log(`📊 Status endpoint: /status`);
});

module.exports = app;

/*const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Crear cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

// Eventos de WhatsApp
client.on('qr', (qr) => {
    console.log('_escanea este código QR con WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp conectado exitosamente!');
});

client.on('message', async (message) => {
    console.log('Mensaje recibido:', message.body);

    // Auto-respuesta simple
    if (message.body === '!ping') {
        client.sendMessage(message.from, 'pong! 🏓');
    }
});

// Iniciar cliente de WhatsApp
client.initialize();

// Rutas API
app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Service API',
        status: client.info ? 'connected' : 'disconnected'
    });
});

// Endpoint para enviar mensaje
app.post('/send-message', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;

        if (!phoneNumber || !message) {
            return res.status(400).json({
                success: false,
                error: 'phoneNumber y message son requeridos'
            });
        }

        const chatId = `${phoneNumber}@c.us`;
        const result = await client.sendMessage(chatId, message);

        res.json({
            success: true,
            messageId: result.id._serialized
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log('📱 Escanea el código QR que aparecerá abajo para conectar WhatsApp');
});

*/