require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');

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
    const { name, email, message, website } = req.body;

    // Defesa Cibernética: Honeypot (Pote de Mel)
    if (website) {
        console.log(`🛡️ [DEVSECOPS] Bot de spam detectado e bloqueado silenciosamente! Nome tentado: ${name}`);
        // Retornamos 200 (Sucesso) para enganar o bot, fazendo ele achar que o spam funcionou, mas NENHUM e-mail é enviado.
        return res.status(200).json({ sucesso: true, mensagem: 'E-mail enviado com sucesso!' });
    }

    // Regra de Negócio / Validação QA (Sad Path)
    if (!name || !email || !message) {
        console.log('Tentativa de envio bloqueada: dados incompletos.');
        return res.status(400).json({ erro: 'Todos os campos (nome, email e mensagem) são obrigatórios!' });
    }

    try {
        // Plano B: Enviando e-mail via API HTTP (Resend) para burlar o bloqueio de portas
        const resend = new Resend(process.env.RESEND_API_KEY);

        const { error } = await resend.emails.send({
            from: 'onboarding@resend.dev', // E-mail padrão de teste do Resend
            to: process.env.EMAIL_USER, // O seu e-mail (precisa ser o mesmo cadastrado no Resend)
            subject: `[Portfólio] Nova mensagem de ${name}`,
            text: `Nome: ${name}\nE-mail: ${email}\n\nMensagem:\n${message}`
        });

        if (error) {
            console.error('Erro na API do Resend:', error);
            return res.status(500).json({ erro: 'Falha interna no servidor de e-mail.' });
        }

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