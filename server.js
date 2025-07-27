const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const cors = require('cors');
const chromium = require('@sparticuz/chromium'); // 👈
const QRCode = require('qrcode'); // para devolver imagen QR

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let lastQr = null;
let ready = false;
let statusMessage = 'Esperando código QR...';

// ⚡ Cliente con Chromium para entornos serverless
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: async () => await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
    },
});

// Eventos
client.on('qr', (qr) => {
    console.log('✅ QR recibido');
    lastQr = qr;
    statusMessage = 'QR disponible, escanéalo con tu WhatsApp.';
});

client.on('ready', () => {
    console.log('✅ Cliente listo');
    ready = true;
    statusMessage = 'Conectado y listo.';
    lastQr = null;
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Cliente desconectado: ', reason);
    ready = false;
    statusMessage = 'Desconectado. Reinicia para nuevo QR.';
    client.initialize();
});

client.initialize();

// Endpoints
app.get('/', (req, res) => {
    res.json({ status: ready ? 'connected' : 'waiting', message: statusMessage });
});

app.get('/status', (req, res) => {
    res.json({ ready, statusMessage, hasQr: !!lastQr });
});

app.get('/qr', async (req, res) => {
    if (!lastQr) return res.status(404).json({ error: 'No hay QR disponible.' });
    try {
        // Generar imagen base64
        const qrImage = await QRCode.toDataURL(lastQr);
        res.json({ qr: lastQr, qrImage });
    } catch (err) {
        res.status(500).json({ error: 'Error generando QR', details: err.message });
    }
});

app.post('/send-message', async (req, res) => {
    const { phoneNumber, message } = req.body;
    if (!ready) return res.status(503).json({ error: 'WhatsApp no está conectado.' });
    try {
        await client.sendMessage(`${phoneNumber}@c.us`, message);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error enviando mensaje' });
    }
});

app.get('/restart', (req, res) => {
    ready = false;
    statusMessage = 'Reiniciando cliente...';
    lastQr = null;
    client.destroy();
    client.initialize();
    res.json({ message: 'Cliente reiniciado' });
});

app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en puerto ${port}`);
});


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