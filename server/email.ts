import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = 'PharmaFlow <notifications@pharmaflow.com>';

interface OrderEmailData {
  orderId: string;
  pharmacieName: string;
  grossisteName: string;
  status: string;
  commentaire?: string;
}

const getStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    validee_delegue: 'Validée délégué',
    validee_pharmacie: 'Validée pharmacie',
    envoyee: 'Envoyée',
    acceptee: 'Acceptée',
    refusee: 'Refusée',
    partiellement_acceptee: 'Partiellement acceptée',
    en_preparation: 'En préparation',
    livree: 'Livrée',
    cloturee: 'Clôturée',
    litige: 'Litige',
    annulee: 'Annulée'
  };
  return labels[status] || status;
};

const getEmailTemplate = (title: string, content: string): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #2563eb; }
    .title { font-size: 20px; font-weight: 600; margin: 20px 0; color: #1f2937; }
    .content { color: #4b5563; }
    .status-badge { display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
    .status-acceptee { background: #d1fae5; color: #065f46; }
    .status-refusee { background: #fee2e2; color: #991b1b; }
    .status-envoyee { background: #dbeafe; color: #1e40af; }
    .status-livree { background: #e0e7ff; color: #3730a3; }
    .info-box { background: #f9fafb; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .info-label { color: #6b7280; font-size: 14px; }
    .info-value { font-weight: 500; color: #1f2937; }
    .footer { text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">💊 PharmaFlow</div>
      </div>
      ${content}
    </div>
    <div class="footer">
      <p>Cet email a été envoyé automatiquement par PharmaFlow.</p>
      <p>© ${new Date().getFullYear()} PharmaFlow - Gestion des commandes pharmaceutiques</p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

export async function sendOrderStatusEmail(
  to: string,
  recipientName: string,
  recipientRole: 'delegue' | 'grossiste' | 'pharmacie',
  orderData: OrderEmailData
): Promise<boolean> {
  if (!resend) {
    console.log('[Email] Resend non configuré - email non envoyé à', to);
    return false;
  }

  let subject = '';
  let content = '';
  const statusLabel = getStatusLabel(orderData.status);
  const statusClass = `status-${orderData.status.replace('_', '-')}`;

  if (recipientRole === 'delegue') {
    if (orderData.status === 'acceptee') {
      subject = `✅ Commande acceptée - ${orderData.orderId.slice(0, 8)}`;
      content = `
        <h2 class="title">Bonne nouvelle, ${recipientName} !</h2>
        <p class="content">Votre commande a été <strong>acceptée</strong> par le grossiste.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${orderData.orderId.slice(0, 8)}</span></div>
          <div class="info-row"><span class="info-label">Pharmacie</span><span class="info-value">${orderData.pharmacieName}</span></div>
          <div class="info-row"><span class="info-label">Grossiste</span><span class="info-value">${orderData.grossisteName}</span></div>
          <div class="info-row"><span class="info-label">Statut</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
        </div>
        <p class="content">La commande sera bientôt préparée et expédiée.</p>
      `;
    } else if (orderData.status === 'refusee') {
      subject = `❌ Commande refusée - ${orderData.orderId.slice(0, 8)}`;
      content = `
        <h2 class="title">Commande refusée</h2>
        <p class="content">Malheureusement, votre commande a été <strong>refusée</strong> par le grossiste.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${orderData.orderId.slice(0, 8)}</span></div>
          <div class="info-row"><span class="info-label">Pharmacie</span><span class="info-value">${orderData.pharmacieName}</span></div>
          <div class="info-row"><span class="info-label">Grossiste</span><span class="info-value">${orderData.grossisteName}</span></div>
          <div class="info-row"><span class="info-label">Statut</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
          ${orderData.commentaire ? `<div class="info-row"><span class="info-label">Motif</span><span class="info-value">${orderData.commentaire}</span></div>` : ''}
        </div>
        <p class="content">Veuillez contacter le grossiste pour plus d'informations.</p>
      `;
    } else if (orderData.status === 'partiellement_acceptee') {
      subject = `⚠️ Commande partiellement acceptée - ${orderData.orderId.slice(0, 8)}`;
      content = `
        <h2 class="title">Commande partiellement acceptée</h2>
        <p class="content">Votre commande a été <strong>partiellement acceptée</strong> par le grossiste.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${orderData.orderId.slice(0, 8)}</span></div>
          <div class="info-row"><span class="info-label">Pharmacie</span><span class="info-value">${orderData.pharmacieName}</span></div>
          <div class="info-row"><span class="info-label">Grossiste</span><span class="info-value">${orderData.grossisteName}</span></div>
          <div class="info-row"><span class="info-label">Statut</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
        </div>
        <p class="content">Consultez les détails de la commande pour voir les produits acceptés.</p>
      `;
    }
  } else if (recipientRole === 'grossiste') {
    if (orderData.status === 'envoyee') {
      subject = `📦 Nouvelle commande reçue - ${orderData.orderId.slice(0, 8)}`;
      content = `
        <h2 class="title">Nouvelle commande à traiter</h2>
        <p class="content">Une nouvelle commande vient d'être envoyée et attend votre traitement.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${orderData.orderId.slice(0, 8)}</span></div>
          <div class="info-row"><span class="info-label">Pharmacie</span><span class="info-value">${orderData.pharmacieName}</span></div>
          <div class="info-row"><span class="info-label">Statut</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
          ${orderData.commentaire ? `<div class="info-row"><span class="info-label">Instructions</span><span class="info-value">${orderData.commentaire}</span></div>` : ''}
        </div>
        <p class="content">Veuillez traiter cette commande dans les meilleurs délais.</p>
      `;
    }
  } else if (recipientRole === 'pharmacie') {
    if (orderData.status === 'livree') {
      subject = `🚚 Commande livrée - ${orderData.orderId.slice(0, 8)}`;
      content = `
        <h2 class="title">Votre commande a été livrée</h2>
        <p class="content">La commande a été marquée comme <strong>livrée</strong> par le grossiste.</p>
        <div class="info-box">
          <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${orderData.orderId.slice(0, 8)}</span></div>
          <div class="info-row"><span class="info-label">Grossiste</span><span class="info-value">${orderData.grossisteName}</span></div>
          <div class="info-row"><span class="info-label">Statut</span><span class="status-badge ${statusClass}">${statusLabel}</span></div>
        </div>
        <p class="content">Veuillez confirmer la réception de la commande dans votre espace PharmaFlow.</p>
      `;
    }
  }

  if (!subject || !content) {
    return false;
  }

  try {
    const html = getEmailTemplate(subject, content);
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html
    });
    console.log(`[Email] Email envoyé à ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error('[Email] Erreur lors de l\'envoi:', error);
    return false;
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}
