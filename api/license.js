// Vercel Serverless Function to check license and monthly payment status
module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Environment variables from Vercel:
  // SYSTEM_STATUS: 'AUTO' | 'ACTIVE' | 'BLOCKED'
  // SYSTEM_PAID_UNTIL: 'YYYY-MM-DD' (Ex: '2026-10-09')
  // DEV_PIX_KEY: chave PIX para pagamento
  // DEV_WHATSAPP: WhatsApp para envio do comprovante
  const systemStatus = (process.env.SYSTEM_STATUS || 'AUTO').toUpperCase();
  const paidUntil = process.env.SYSTEM_PAID_UNTIL || '2026-10-09';
  const devPixKey = process.env.DEV_PIX_KEY || 'brisasofc@gmail.com';
  const devPixType = process.env.DEV_PIX_TYPE || 'E-mail';
  const devWhatsapp = process.env.DEV_WHATSAPP || '5511999999999';
  const devMasterPassword = process.env.DEV_MASTER_PASSWORD || 'desbloquear2026';
  const monthlyAmount = process.env.MONTHLY_AMOUNT || '150,00';

  // Server current date YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  let isBlocked = false;
  let reason = '';

  if (systemStatus === 'BLOCKED') {
    isBlocked = true;
    reason = 'Acesso suspenso por decisão administrativa do desenvolvedor.';
  } else if (systemStatus === 'ACTIVE') {
    isBlocked = false;
    reason = 'Sistema liberado (status ativo forçado na Vercel).';
  } else {
    // AUTO: check if current date >= paidUntil
    // Ex: Today is 2026-09-09 -> NOT blocked (paidUntil is 2026-10-09).
    // On 2026-10-09 -> BLOCKED!
    if (today >= paidUntil) {
      isBlocked = true;
      reason = `Acesso suspenso: A mensalidade do ciclo de ${paidUntil} está pendente.`;
    } else {
      isBlocked = false;
      reason = `Sistema ativo e regularizado até ${paidUntil}.`;
    }
  }

  // Check if client provided master unlock password
  const providedPassword = req.query.unlockPassword;
  if (providedPassword && providedPassword === devMasterPassword) {
    isBlocked = false;
    reason = 'Sistema temporariamente desbloqueado com senha mestra de emergência.';
  }

  res.status(200).json({
    blocked: isBlocked,
    paidUntil,
    today,
    systemStatus,
    pixKey: devPixKey,
    pixType: devPixType,
    whatsapp: devWhatsapp,
    monthlyAmount,
    reason
  });
};
