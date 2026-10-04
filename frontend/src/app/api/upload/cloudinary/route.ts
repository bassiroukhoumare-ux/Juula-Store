import { NextResponse, type NextRequest } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

function ensureConfigured() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials missing');
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export async function POST(req: NextRequest) {
  try {
    ensureConfigured();

    const contentType = req.headers.get('content-type') || '';

    // Case 1: FormData with file
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const res = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'juula/products',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error || !result) {
              return reject(error || new Error('Upload échoué'));
            }
            resolve({ secure_url: result.secure_url, public_id: result.public_id });
          }
        );
        stream.end(buffer);
      });

      return NextResponse.json({
        success: true,
        url: res.secure_url,
        publicId: res.public_id,
      });
    }

    // Case 2: JSON payload with base64 string
    const body = await req.json().catch(() => null);
    if (body?.image) {
      const uploadRes = await cloudinary.uploader.upload(body.image, {
        folder: 'juula/products',
        resource_type: 'auto',
      });

      return NextResponse.json({
        success: true,
        url: uploadRes.secure_url,
        publicId: uploadRes.public_id,
      });
    }

    return NextResponse.json({ error: 'Format de requête non supporté' }, { status: 400 });
  } catch (error: any) {
    console.error('[Cloudinary Upload Error]', error);
    return NextResponse.json(
      { error: error?.message || 'Erreur lors du téléversement vers Cloudinary' },
      { status: 500 }
    );
  }
}
