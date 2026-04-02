import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });

  return NextResponse.json({
    rekeningBalans: settings.rekeningBalans,
    beginVermogen: settings.beginVermogen,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpFrom: settings.smtpFrom,
    bedrijfNaam: settings.bedrijfNaam,
    bedrijfContact: settings.bedrijfContact,
    bedrijfAdres: settings.bedrijfAdres,
    bedrijfPostcode: settings.bedrijfPostcode,
    bedrijfTelefoon: settings.bedrijfTelefoon,
    bedrijfEmail: settings.bedrijfEmail,
    bedrijfKvk: settings.bedrijfKvk,
    bedrijfBtw: settings.bedrijfBtw,
    bedrijfIban: settings.bedrijfIban,
    factuurLogo: settings.factuurLogo,
    factuurLogoGrootte: settings.factuurLogoGrootte,
    factuurKleur: settings.factuurKleur,
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data: Record<string, any> = {};

  const velden = [
    'rekeningBalans', 'beginVermogen',
    'smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom',
    'bedrijfNaam', 'bedrijfContact', 'bedrijfAdres', 'bedrijfPostcode',
    'bedrijfTelefoon', 'bedrijfEmail', 'bedrijfKvk', 'bedrijfBtw', 'bedrijfIban',
    'factuurLogo', 'factuurLogoGrootte', 'factuurKleur',
  ];

  for (const veld of velden) {
    if (body[veld] !== undefined) data[veld] = body[veld];
  }

  const settings = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: data,
    update: data,
  });

  return NextResponse.json({
    rekeningBalans: settings.rekeningBalans,
    beginVermogen: settings.beginVermogen,
    smtpHost: settings.smtpHost,
    smtpPort: settings.smtpPort,
    smtpUser: settings.smtpUser,
    smtpFrom: settings.smtpFrom,
    bedrijfNaam: settings.bedrijfNaam,
    bedrijfContact: settings.bedrijfContact,
    bedrijfAdres: settings.bedrijfAdres,
    bedrijfPostcode: settings.bedrijfPostcode,
    bedrijfTelefoon: settings.bedrijfTelefoon,
    bedrijfEmail: settings.bedrijfEmail,
    bedrijfKvk: settings.bedrijfKvk,
    bedrijfBtw: settings.bedrijfBtw,
    bedrijfIban: settings.bedrijfIban,
    factuurLogo: settings.factuurLogo,
    factuurLogoGrootte: settings.factuurLogoGrootte,
    factuurKleur: settings.factuurKleur,
  });
}
