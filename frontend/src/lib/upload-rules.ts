// What merchants can upload, shared by the signing route (server) and the
// uploader (browser). Cloudinary enforces `formats` server-side after
// inspecting the file; `maxBytes` mirrors the Cloudinary plan limits so the
// browser can refuse early with a clear message.
export type MediaKind = 'image' | 'video' | 'audio';

export const MEDIA_RULES: Record<
  MediaKind,
  { resourceType: 'image' | 'video'; formats: string[]; maxBytes: number; label: string }
> = {
  image: {
    resourceType: 'image',
    formats: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif', 'avif'],
    maxBytes: 10 * 1024 * 1024,
    label: 'JPG, PNG, WebP ou HEIC (10 Mo max)',
  },
  video: {
    resourceType: 'video',
    formats: ['mp4', 'mov', 'webm', 'm4v', '3gp'],
    maxBytes: 100 * 1024 * 1024,
    label: 'MP4, MOV ou WebM (100 Mo max)',
  },
  // Cloudinary stores audio under the "video" resource type.
  audio: {
    resourceType: 'video',
    formats: ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'webm', 'amr'],
    maxBytes: 25 * 1024 * 1024,
    label: 'MP3, M4A, WAV, OGG ou note vocale (25 Mo max)',
  },
};
