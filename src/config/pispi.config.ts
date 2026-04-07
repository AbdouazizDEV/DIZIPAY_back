import { registerAs } from '@nestjs/config';

export default registerAs('pispi', () => ({
  baseUrl: process.env.PISPI_BASE_URL,
  clientId: process.env.PISPI_CLIENT_ID,
  clientSecret: process.env.PISPI_CLIENT_SECRET,
  institutionId: process.env.PISPI_INSTITUTION_ID,
  tokenUrl: process.env.PISPI_TOKEN_URL,
  webhookSecret: process.env.PISPI_WEBHOOK_SECRET,
  /** En-tête HMAC du webhook (défaut x-pispi-signature) */
  webhookSignatureHeader:
    process.env.PISPI_WEBHOOK_SIGNATURE_HEADER ?? 'x-pispi-signature',
  /** Code pays UEMOA pour la payload EMV (ex. SN, CI) — voir guides QR */
  countryCode: process.env.PISPI_COUNTRY_CODE ?? 'SN',
  /** Optionnel : clé API dashboard (Business API) */
  apiKey: process.env.PISPI_API_KEY,
  tokenExpirationSeconds: parseInt(
    process.env.PISPI_TOKEN_EXPIRATION ?? '300',
    10,
  ),
}));
