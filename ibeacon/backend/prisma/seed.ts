import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    await prisma.beacon.deleteMany();
    const beacons = [
        { uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825', major: '10001', minor: '19645', alias: 'Office' },
        { uuid: 'FDA50693-A4E2-4FB1-AFCF-C6EB07647825', major: '10001', minor: '19646', alias: 'Next to the elevator' },
        { uuid: 'D4F6A8C0-E2B4-4D6F-8A0C-2E4B6D8F0A2C', major: '10001', minor: '5001', alias: '본사 1층' },
        { uuid: 'D4F6A8C0-E2B4-4D6F-8A0C-2E4B6D8F0A2C', major: '10001', minor: '5002', alias: '본사 2층' },
        { uuid: 'D4F6A8C0-E2B4-4D6F-8A0C-2E4B6D8F0A2C', major: '10001', minor: '5003', alias: '본사 3층' },
        { uuid: 'D4F6A8C0-E2B4-4D6F-8A0C-2E4B6D8F0A2C', major: '10001', minor: '5004', alias: '본사 4층' },
    ];

    for (const beacon of beacons) {
        await prisma.beacon.upsert({
            where: {
                uuid_major_minor: {
                    uuid: beacon.uuid,
                    major: beacon.major,
                    minor: beacon.minor,
                },
            },
            update: {},
            create: beacon,
        });
    }

    console.log('Seed data added successfully');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
