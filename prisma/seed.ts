import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import {
  PrismaClient,
  MerchantStatus,
  MerchantType,
  UserRole,
} from '@prisma/client';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL manquant pour le seed');
}

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('DizipayDev1!', 12);

  /** Alias SMID réel (sandbox Dizigroup — Playground POST /comptes/{numero}/alias) */
  const demoPispiAlias = '6de43fd2-8dda-4474-8d93-96c1e7319c83';
  /** Compte sandbox Banque Sénégal 999 (GET /comptes) */
  const demoPispiAccount = '10108672388920614979';

  const user = await prisma.user.upsert({
    where: { email: 'merchant@dizipay.local' },
    update: {},
    create: {
      email: 'merchant@dizipay.local',
      password: passwordHash,
      role: UserRole.MERCHANT,
      merchant: {
        create: {
          name: 'Pharmacie Démo',
          type: MerchantType.PHARMACY,
          phone: '+221771234567',
          pispiAccountId: demoPispiAccount,
          pispiAlias: demoPispiAlias,
          status: MerchantStatus.ACTIVE,
        },
      },
    },
    include: { merchant: true },
  });

  let merchant = await prisma.merchant.findFirst({
    where: { userId: user.id },
  });
  if (merchant) {
    merchant = await prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        pispiAccountId: demoPispiAccount,
        pispiAlias: demoPispiAlias,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed OK:', user.email, 'merchantId=', merchant?.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
