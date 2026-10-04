import { S3Client, PutObjectCommand, GetObjectCommand, S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Config: S3ClientConfig = {
  forcePathStyle: true,
};

const endpoint = process.env.NEON_STORAGE_ENDPOINT || process.env.AWS_ENDPOINT_URL_S3;
if (endpoint) {
  s3Config.endpoint = endpoint;
}

if (process.env.AWS_REGION) {
  s3Config.region = process.env.AWS_REGION;
}

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const s3Client = new S3Client(s3Config);

const DEFAULT_BUCKET = process.env.NEON_STORAGE_BUCKET || 'assets';

export async function uploadToNeonStorage(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType?: string,
  bucket = DEFAULT_BUCKET
) {
  const putParams: {
    Bucket: string;
    Key: string;
    Body: any;
    ContentType?: string;
  } = {
    Bucket: bucket,
    Key: key,
    Body: body,
  };

  if (contentType) {
    putParams.ContentType = contentType;
  }

  await s3Client.send(new PutObjectCommand(putParams));

  const viewUrl = await getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 * 24 } // 24 hours
  );

  return { key, url: viewUrl };
}

export async function getNeonStorageUrl(key: string, bucket = DEFAULT_BUCKET, expiresIn = 3600) {
  return getSignedUrl(
    s3Client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn }
  );
}
