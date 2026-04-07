#!/usr/bin/env bash
# Tests manuels des endpoints (après migrations + seed + serveur démarré).
# Usage: BASE_URL=http://127.0.0.1:3000 ./scripts/test-api.sh
set -euo pipefail
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
API="${BASE_URL}/api/v1"

echo "=== 1. POST /auth/login ==="
LOGIN=$(curl -sS -X POST "${API}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant@dizipay.local","password":"DizipayDev1!"}')
echo "$LOGIN" | jq . 2>/dev/null || echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | jq -r '.access_token // empty')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Échec login — arrêt."
  exit 1
fi

echo ""
echo "=== 2. POST /payments/merchant-presented-qr ==="
curl -sS -X POST "${API}/payments/merchant-presented-qr" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"amount":5775,"includeSvg":false}' | jq . 2>/dev/null || cat

echo ""
echo "=== 3. POST /payments/scan-and-pay (exemple EMV — peut échouer côté PI-SPI) ==="
curl -sS -w "\nHTTP:%{http_code}\n" -X POST "${API}/payments/scan-and-pay" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"qrCode":"00020101021226370009WAVE_SN010811234567890211+221771234567520400005303952540557756.00630489","amount":5775,"description":"Test"}' \
  | head -c 2000

echo ""
echo "=== Terminé (vérifiez les statuts HTTP et les erreurs PI-SPI). ==="
