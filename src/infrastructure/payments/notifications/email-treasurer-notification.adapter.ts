import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TreasurerOperationType } from '@/domain/payments/enums/treasurer-operation-type.enum';
import {
  TreasurerNotificationPayload,
  TreasurerNotificationPort,
} from '@/domain/payments/ports/treasurer-notification.port';

/**
 * Adapter e-mail pour les alertes trésorier.
 *
 * Single Responsibility : formate le message et l'envoie.
 * Aucune logique métier de paiement (montants déjà validés côté use case / event).
 *
 * MVP : envoi via Logger tant qu'aucun transporteur SMTP n'est configuré.
 * Brancher un client SMTP (ou un provider d'e-mail) dans {@link deliver}
 * sans modifier le contrat {@link TreasurerNotificationPort}.
 */
@Injectable()
export class EmailTreasurerNotificationAdapter
  implements TreasurerNotificationPort
{
  private readonly logger = new Logger(EmailTreasurerNotificationAdapter.name);
  private readonly treasurerEmail: string;

  constructor(private readonly config: ConfigService) {
    this.treasurerEmail =
      this.config.get<string>('TREASURER_EMAIL')?.trim() ||
      'tresorier@dizipay.local';
  }

  async notify(payload: TreasurerNotificationPayload): Promise<void> {
    const subject = this.buildSubject(payload);
    const body = this.buildBody(payload);
    await this.deliver(subject, body);
  }

  private buildSubject(payload: TreasurerNotificationPayload): string {
    const label =
      payload.operationType === TreasurerOperationType.DEPOSIT
        ? 'Dépôt'
        : 'Retrait';
    return `[DiziPay] ${label} — ${payload.amount} ${payload.currency}`;
  }

  private buildBody(payload: TreasurerNotificationPayload): string {
    const operationLabel =
      payload.operationType === TreasurerOperationType.DEPOSIT
        ? 'Dépôt'
        : 'Retrait';
    const lines = [
      `Type d'opération : ${operationLabel}`,
      `Montant         : ${payload.amount} ${payload.currency}`,
      `Compte concerné : ${payload.accountLabel}`,
      `Horodatage      : ${payload.occurredAt.toISOString()}`,
    ];
    if (payload.reference) {
      lines.push(`Référence       : ${payload.reference}`);
    }
    return lines.join('\n');
  }

  /**
   * Point d'extension SMTP. Aujourd'hui : journalisation structurée.
   */
  private async deliver(subject: string, body: string): Promise<void> {
    this.logger.log(
      `E-mail trésorier → ${this.treasurerEmail}\nSujet: ${subject}\n${body}`,
    );
  }
}
