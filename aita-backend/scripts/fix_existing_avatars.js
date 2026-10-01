import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resolveCloudinaryAvatarUrl(url) {
  if (!url) return null;
  const collectionMatch = url.match(/collection\.cloudinary\.com\/([^/]+)\/([a-zA-Z0-9_-]+)/i);
  if (collectionMatch) {
    const [, cloudName, collectionId] = collectionMatch;
    try {
      const apiUrl = `https://console.cloudinary.com/console/api/v1/collections/public/${cloudName}/${collectionId}`;
      const res = await fetch(apiUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        const asset = data.assets?.[0];
        if (asset) {
          const directUrl = asset.delivery_urls?.original ||
                           asset.delivery_urls?.preview ||
                           asset.delivery_urls?.thumbnail ||
                           (asset.public_id ? `https://res.cloudinary.com/${cloudName}/image/upload/${asset.public_id}.${asset.format || 'jpg'}` : null);
          if (directUrl) {
            return directUrl;
          }
        }
      }
    } catch (err) {
      console.warn(`[Avatar Resolver] Lỗi giải mã ${url}:`, err);
    }
  }
  return url;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { Avatar: { not: null } }
  });

  for (const u of users) {
    if (u.Avatar && u.Avatar.includes('collection.cloudinary.com')) {
      console.log(`Resolving for ${u.FullName} (${u.Email}): ${u.Avatar}`);
      const direct = await resolveCloudinaryAvatarUrl(u.Avatar);
      console.log(`=> Resolved to: ${direct}`);
      if (direct && direct !== u.Avatar) {
        await prisma.user.update({
          where: { Id: u.Id },
          data: { Avatar: direct }
        });
        console.log(`✅ Updated ${u.FullName} Avatar in DB!`);
      }
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
