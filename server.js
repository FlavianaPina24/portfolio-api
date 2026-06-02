require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const app = express();

// 1. Middlewares (A "Alfândega" da nossa API)
app.use(cors()); // Permite que o front-end converse com a API
app.use(express.json()); // Ensina a API a entender payloads JSON

// 1.5 Defesa Cibernética: Rate Limiter (Escudo Anti-DDoS e Anti-Spam)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Janela de 15 minutos
    max: 3, // Limita cada IP a 3 envios por janela (15 min)
    message: { erro: 'Muitas tentativas de envio deste IP. Por favor, aguarde 15 minutos antes de tentar novamente.' },
    standardHeaders: true, // Retorna informações de limite nos headers (RateLimit-*)
    legacyHeaders: false, // Desabilita os headers antigos X-RateLimit-*
});

// 1.8 Conexão com o Banco de Dados (MongoDB)
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('📦 Conectado ao MongoDB com sucesso!'))
    .catch(err => console.error('❌ Erro ao conectar no MongoDB:', err));

// 1.9 Modelo de Dados (Contrato do Banco)
const testimonialSchema = new mongoose.Schema({
    name: String,
    role: String,
    message: String,
    status: { type: String, default: 'Pendente' } // Segurança: Nasce pendente para moderação
}, { timestamps: true });

const Testimonial = mongoose.model('Testimonial', testimonialSchema);

// 1.10 Modelo de Dados para Contatos (CRM/Backup)
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    status: { type: String, default: 'Não Lido' } // Controle interno para você saber se já respondeu a pessoa
}, { timestamps: true });

const Contact = mongoose.model('Contact', contactSchema);

// 2. Rota de Boas-Vindas
app.get('/', (req, res) => {
    res.send('API do Portfólio da Flaviana está ONLINE! 🚀');
});

// 3. Rota de Contato
app.post('/api/contact', apiLimiter, async (req, res) => {
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
        // NOVO: Salva o contato no Banco de Dados (Backup e Histórico CRM)
        await Contact.create({ name, email, message });

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

// 4. Rota de Depoimentos (Feedback)
app.post('/api/testimonial', apiLimiter, async (req, res) => {
    const { name, role, message, website } = req.body;

    // Defesa Cibernética: Pote de Mel (Honeypot) também nos depoimentos!
    if (website) {
        console.log(`🛡️ [DEVSECOPS] Bot de spam bloqueado no depoimento! Nome tentado: ${name}`);
        return res.status(200).json({ sucesso: true });
    }

    if (!name || !role || !message) {
        return res.status(400).json({ erro: 'Todos os campos são obrigatórios!' });
    }

    try {
        // Salva o depoimento no Banco de Dados com status "Pendente"
        await Testimonial.create({ name, role, message });

        const resend = new Resend(process.env.RESEND_API_KEY);
        const { error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: process.env.EMAIL_USER,
            subject: `[Portfólio] Novo Depoimento de ${name}`,
            text: `Nome: ${name}\nCargo: ${role}\n\nDepoimento:\n${message}`
        });

        if (error) {
            return res.status(500).json({ erro: 'Falha interna no servidor de e-mail.' });
        }
        return res.status(200).json({ sucesso: true });
    } catch (error) {
        return res.status(500).json({ erro: 'Falha interna no servidor.' });
    }
});

// 4.5 Rota para buscar os depoimentos aprovados (O Site vai ler daqui!)
app.get('/api/testimonial', async (req, res) => {
    try {
        const depoimentos = await Testimonial.find({ status: 'Aprovado' }).sort({ createdAt: -1 }); // Retorna os mais recentes primeiro
        return res.status(200).json(depoimentos);
    } catch (error) {
        return res.status(500).json({ erro: 'Falha ao buscar depoimentos no banco de dados.' });
    }
});

// 5. Ligar o Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando lindamente na porta ${PORT}\nAcesse: http://localhost:${PORT}`);
});