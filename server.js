const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const chromium = require('@sparticuz/chromium'); // 👈 IMPORTANTE

const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Crear carpeta de sesiones
const SESSION_DIR = process.env.RENDER ? '/tmp/sessions' : './sessions';
if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Estado global
let qrCodeData = '';
let isConnected = false;

// Inicialización asíncrona para usar chromium.executablePath()
(async () => {
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: 'whatsapp-service',
            dataPath: SESSION_DIR
        }),
        puppeteer: {
            headless: true,
            executablePath: await chromium.executablePath(),
            args: chromium.args,
            defaultViewport: chromium.defaultViewport
        }
    });

    // Eventos de cliente
    client.on('qr', (qr) => {
        console.log('=== ESCANEA ESTE CÓDIGO QR ===');
        qrcode.generate(qr, { small: true });
        qrCodeData = qr;
        console.log('==============================');
    });

    client.on('ready', () => {
        isConnected = true;
        qrCodeData = '';
        console.log('✅ WhatsApp conectado exitosamente!');
    });

    client.on('disconnected', (reason) => {
        console.log('⚠️ WhatsApp desconectado:', reason);
        isConnected = false;
        setTimeout(() => {
            client.initialize();
        }, 5000);
    });

    // Inicializar cliente
    client.initialize();

    // Rutas
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });

    app.get('/status', (req, res) => {
        res.json({
            connected: isConnected,
            service: 'WhatsApp Service',
            timestamp: new Date().toISOString()
        });
    });

    app.get('/qr', async (req, res) => {
        if (isConnected) {
            return res.json({
                status: 'connected',
                message: 'WhatsApp ya está conectado'
            });
        }
        if (qrCodeData) {
            const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeData)}&size=300x300`;
            return res.json({
                status: 'pending',
                qr: qrImageUrl,
                message: 'Escanea este código QR con WhatsApp'
            });
        } else {
            return res.json({
                status: 'waiting',
                message: 'Esperando código QR...'
            });
        }
    });

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
            console.error('Error al enviar mensaje:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    });

    app.get('/restart', async (req, res) => {
        try {
            console.log('♻️ Reiniciando cliente WhatsApp...');
            isConnected = false;
            await client.destroy();
            setTimeout(() => {
                client.initialize();
            }, 2000);
            res.json({ success: true, message: 'Cliente reiniciándose...' });
        } catch (err) {
            console.error('Error al reiniciar:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    });

    // Keep alive
    setInterval(() => {
        console.log('⏳ Keep alive ping');
    }, 300000);

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Servidor WhatsApp corriendo en puerto ${PORT}`);
    });
})();


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