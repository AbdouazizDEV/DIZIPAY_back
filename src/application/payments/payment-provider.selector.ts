import { Inject, Injectable } from '@nestjs/common';
import { PaymentProviderType } from '@/domain/payments/enums/payment-provider-type.enum';
import { PaymentProviderUnavailableError } from '@/domain/payments/errors/domain.errors';
import { PaymentProviderPort } from '@/domain/payments/ports/payment-provider.port';
import {
  PSPI_PAYMENT_PROVIDER,
  WAVE_PAYMENT_PROVIDER,
} from '@/domain/payments/tokens/payment-domain.tokens';

/**
 * Résout le {@link PaymentProviderPort} selon le choix du payeur.
 *
 * Dependency Inversion : les use cases injectent ce sélecteur,
 * jamais les adapters concrets. Pas de `switch` métier dispersé —
 * la résolution se fait via les tokens DI déjà enregistrés.
 *
 * MVP : PSPI actif ; WAVE résolu mais lève « non disponible » dans l'adapter.
 */
@Injectable()
export class PaymentProviderSelector {
  constructor(
    @Inject(PSPI_PAYMENT_PROVIDER)
    private readonly pspiProvider: PaymentProviderPort,
    @Inject(WAVE_PAYMENT_PROVIDER)
    private readonly waveProvider: PaymentProviderPort,
  ) {}

  /**
   * @throws {PaymentProviderUnavailableError} si le type n'est pas enregistré
   */
  select(providerType: PaymentProviderType): PaymentProviderPort {
    switch (providerType) {
      case PaymentProviderType.PSPI:
        return this.pspiProvider;
      case PaymentProviderType.WAVE:
        return this.waveProvider;
      default: {
        const unknown = providerType as string;
        throw new PaymentProviderUnavailableError(unknown);
      }
    }
  }
}
