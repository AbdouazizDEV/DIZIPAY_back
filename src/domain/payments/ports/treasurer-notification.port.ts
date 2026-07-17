import { TreasurerOperationType } from '@/domain/payments/enums/treasurer-operation-type.enum';

/**
 * Contenu minimal d'une notification trésorerie.
 *
 * Garantit : toutes les informations requises pour alerter le trésorier
 * sont présentes, indépendamment du canal (email, SMS, Slack…).
 */
export interface TreasurerNotificationPayload {
  readonly operationType: TreasurerOperationType;
  /** Montant en centimes (plus petite unité). */
  readonly amount: number;
  readonly currency: string;
  /** Libellé du compte concerné (IBAN masqué, alias PSPI, etc.). */
  readonly accountLabel: string;
  readonly occurredAt: Date;
  readonly reference?: string;
}

/**
 * Port de domaine — notification du trésorier.
 *
 * Contrat :
 * - Ne contient aucune logique métier de paiement : formatage + envoi uniquement.
 * - Les implémentations (email, SMS…) sont interchangeables sans modifier les use cases.
 * - {@link notify} ne doit pas lever d'exception bloquante pour le flux principal
 *   si le canal est indisponible — l'appelant (handler d'event) décide du retry.
 */
export interface TreasurerNotificationPort {
  notify(payload: TreasurerNotificationPayload): Promise<void>;
}
