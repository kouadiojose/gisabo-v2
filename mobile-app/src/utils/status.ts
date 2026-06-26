// Libellés / couleurs des statuts (transferts et commandes), partagés par les
// écrans qui les affichent.
export function statusLabel(status: string): string {
  switch (status) {
    case 'completed':
      return 'Complété';
    case 'processing':
      return 'En cours';
    case 'pending':
      return 'En attente';
    case 'failed':
      return 'Échoué';
    default:
      return status;
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case 'completed':
      return '#4CAF50';
    case 'processing':
      return '#FF9800';
    case 'pending':
      return '#2196F3';
    case 'failed':
      return '#e53935';
    default:
      return '#666';
  }
}

export function formatDate(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}
