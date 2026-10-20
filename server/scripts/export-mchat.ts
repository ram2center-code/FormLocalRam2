import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { generateStandaloneFormHtml } from '../../client/src/features/forms/utils/exportHtml.js';

const prisma = new PrismaClient();

async function run() {
  const version = await prisma.formVersion.findFirst({
    where: { formId: 'cmvcglss30001a6geo289q1y5' },
    orderBy: { version: 'desc' },
    include: { form: true },
  });

  if (!version) {
    console.error('Form not found!');
    return;
  }

  const formDetail = {
    ...version.form,
    schema: version.schema as any,
  };

  const html = generateStandaloneFormHtml(formDetail as any);
  const dest = path.resolve('../M-CHAT-R_Thai_iPad_Test.html');
  fs.writeFileSync(dest, html, 'utf-8');
  console.log('✅ Successfully created standalone HTML file at:', dest);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
