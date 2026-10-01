/**
 * Utility for extracting, resolving, and normalizing Avatar/Image URLs from Excel rows.
 * Supports Cloudinary collection URLs, direct Cloudinary URLs, external image links,
 * and various Vietnamese/English column aliases.
 */

export function normalizeExcelHeader(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove Vietnamese diacritics
        .replace(/[^a-z0-9]/g, ' ')       // replace symbols with spaces
        .replace(/\s+/g, ' ')
        .trim();
}

export function extractAvatarUrl(val: unknown): string | null {
    if (!val) return null;
    let str = String(val).trim();
    if (!str || str === 'undefined' || str === 'null') return null;

    // Handle Excel =HYPERLINK("https://...", "...") or HYPERLINK("https://...")
    const hyperlinkMatch = str.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
    if (hyperlinkMatch && hyperlinkMatch[1]) {
        str = hyperlinkMatch[1].trim();
    }

    // Strip leading/trailing quotes, apostrophes, angle brackets, backticks, parenthesis
    str = str.replace(/^["'`<\s(]+|["'`>\s)]+$/g, '').trim();

    // Check if it's a valid HTTP/HTTPS URL
    if (/^https?:\/\//i.test(str)) {
        return str;
    }

    return null;
}

const AVATAR_EXACT_ALIASES = [
    'avatar', 'ảnh đại diện', 'anh dai dien', 'hình ảnh', 'hinh anh', 'ảnh', 'anh', 'hình', 'hinh',
    'avatar url', 'avatar_url', 'avatarlink', 'avatar link',
    'link avatar', 'link_avatar', 'link anh', 'link ảnh', 'link hinh', 'link hình',
    'link hinh anh', 'link hình ảnh', 'đường link hình ảnh', 'duong link hinh anh',
    'đường dẫn hình ảnh', 'duong dan hinh anh', 'đường dẫn ảnh', 'duong dan anh',
    'ảnh cá nhân', 'anh ca nhan', 'hình cá nhân', 'hinh ca nhan',
    'url anh', 'url ảnh', 'url hinh', 'url hình', 'url hinh anh', 'url hình ảnh',
    'image', 'image url', 'image_url', 'imageurl', 'picture', 'picture url', 'picture_url',
    'photo', 'photo url', 'photo_url', 'profile picture', 'profile_picture', 'profile image', 'profile_image',
    'cloudinary', 'cloudinary url', 'cloudinary link', 'cloudinary_url', 'cloudinary_link',
    'link cloudinary', 'link_cloudinary', 'url cloudinary', 'url_cloudinary',
    'user avatar', 'student avatar', 'lecturer avatar', 'img', 'img url', 'img_url', 'pic', 'photo'
];

/**
 * Finds and extracts the avatar URL from any Excel row record.
 */
export function getAvatarFromRow(row: Record<string, unknown>): string | null {
    if (!row || typeof row !== 'object') return null;

    // 1. Check all headers against known aliases and normalized keywords
    for (const [header, value] of Object.entries(row)) {
        const normHeader = normalizeExcelHeader(header);
        const lowerHeader = header.trim().toLowerCase();

        // Exact or normalized alias match
        const isMatched = AVATAR_EXACT_ALIASES.includes(lowerHeader) || 
                          AVATAR_EXACT_ALIASES.some(a => normalizeExcelHeader(a) === normHeader);

        if (isMatched) {
            const url = extractAvatarUrl(value);
            if (url) return url;
        }

        // Fuzzy match on header keywords
        if (
            normHeader.includes('avatar') ||
            normHeader.includes('cloudinary') ||
            normHeader.includes('profile pic') ||
            normHeader.includes('profile image') ||
            ((normHeader.includes('anh') || normHeader.includes('hinh') || normHeader.includes('image') || normHeader.includes('photo') || normHeader.includes('picture')) &&
             (normHeader.includes('link') || normHeader.includes('url') || normHeader.includes('ca nhan') || normHeader.includes('dai dien') || normHeader.includes('gv') || normHeader.includes('sv') || normHeader.includes('hoc sinh') || normHeader.includes('giang vien') || normHeader.includes('nguoi dung') || normHeader.includes('user')))
        ) {
            const url = extractAvatarUrl(value);
            if (url) return url;
        }
    }

    // 2. Fallback: Search all cell values in this row for any valid Cloudinary or image URL
    for (const [_, value] of Object.entries(row)) {
        const url = extractAvatarUrl(value);
        if (url && (
            url.includes('cloudinary.com') ||
            url.includes('/image/upload/') ||
            url.includes('res.cloudinary') ||
            /\.(jpeg|jpg|png|webp|gif|svg)(\?.*)?$/i.test(url)
        )) {
            return url;
        }
    }

    return null;
}

/**
 * Resolves Cloudinary Collection link (collection.cloudinary.com) or share link to direct image URL.
 * e.g. https://collection.cloudinary.com/xadxabsr/259354b8d693ae70bb1fb91708324085
 * => https://res.cloudinary.com/xadxabsr/image/upload/v1786376251/a0224bcc-6f48-41ba-8c5c-5dea0854d467_u2ujgk.jpg
 */
export async function resolveCloudinaryAvatarUrl(url: string | null | undefined): Promise<string | null> {
    if (!url) return null;
    const cleanUrl = extractAvatarUrl(url);
    if (!cleanUrl) return null;

    // Check if it's a collection.cloudinary.com link
    const collectionMatch = cleanUrl.match(/collection\.cloudinary\.com\/([^/]+)\/([a-zA-Z0-9_-]+)/i);
    if (collectionMatch) {
        const [, cloudName, collectionId] = collectionMatch;
        const candidateEndpoints = [
            `https://console.cloudinary.com/console/api/v1/collections/public/${cloudName}/${collectionId}/search`,
            `https://console.cloudinary.com/console/api/v1/collections/public/${cloudName}/${collectionId}/collection_info`,
            `https://console.cloudinary.com/console/api/v1/collections/public/${cloudName}/${collectionId}`
        ];

        for (const apiUrl of candidateEndpoints) {
            try {
                const res = await fetch(apiUrl, {
                    headers: {
                        'Accept': 'application/json, text/plain, */*',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': `https://collection.cloudinary.com/${cloudName}/${collectionId}`
                    },
                    signal: AbortSignal.timeout(6000)
                });
                if (res.ok) {
                    const data: any = await res.json();
                    const asset = data.assets?.[0] || data.resources?.[0] || data;
                    if (asset) {
                        const directUrl = asset.delivery_urls?.original ||
                                         asset.delivery_urls?.preview ||
                                         asset.delivery_urls?.thumbnail ||
                                         asset.secure_url ||
                                         asset.url ||
                                         (asset.public_id ? `https://res.cloudinary.com/${cloudName}/image/upload/${asset.public_id}.${asset.format || 'jpg'}` : null);
                        if (directUrl) {
                            return directUrl;
                        }
                    }
                }
            } catch {
                // Continue to next candidate endpoint
            }
        }
    }

    return cleanUrl;
}

