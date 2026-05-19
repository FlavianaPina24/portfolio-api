require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();

// 1. Middlewares (A "Alfândega" da nossa API)
app.use(cors()); // Permite que o front-end converse com a API
app.use(express.json()); // Ensina a API a entender payloads JSON

// 2. Rota de Boas-Vindas
app.get('/', (req, res) => {
    res.send('API do Portfólio da Flaviana está ONLINE! 🚀');
});

// 3. Rota de Contato
app.post('/api/contact', async (req, res) => {
    const { name, email, message } = req.body;

    // Regra de Negócio / Validação QA (Sad Path)
    if (!name || !email || !message) {
        console.log('Tentativa de envio bloqueada: dados incompletos.');
        return res.status(400).json({ erro: 'Todos os campos (nome, email e mensagem) são obrigatórios!' });
    }

    try {
        // Configuração do "Carteiro" (Nodemailer)
        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // O false indica que usaremos STARTTLS (Padrão mais amigável para Nuvem)
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // O conteúdo do e-mail
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Envia para você mesma
            subject: `[Portfólio] Nova mensagem de ${name}`,
            text: `Nome: ${name}\nE-mail: ${email}\n\nMensagem:\n${message}`
        };

        // Dispara o e-mail
        await transporter.sendMail(mailOptions);

        console.log(`[SUCESSO] E-mail enviado com sucesso de: ${name} (${email})`);
        return res.status(200).json({ sucesso: true, mensagem: 'E-mail enviado com sucesso!' });
    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(500).json({ erro: 'Falha interna no servidor.' });
    }
});

// 4. Ligar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando lindamente na porta ${PORT}\nAcesse: http://localhost:${PORT}`);
});