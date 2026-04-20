const express = require('express');
const multer = require('multer');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const router = express.Router();

// Use memory storage — file stays in RAM, never written to disk
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * POST /api/upload
 *
 * Body (multipart/form-data):
 *   file        — the file to upload (required)
 *   bucket      — S3 bucket name (required)
 *   region      — AWS region, e.g. "us-east-1" (required)
 *   accessKeyId — AWS access key (required)
 *   secretAccessKey — AWS secret key (required)
 *   folder      — optional subfolder prefix inside the bucket
 *   linkType    — "public" | "presigned" (default: "public")
 *   expiresIn   — presigned URL expiry in seconds (default: 3600)
 *
 * Response:
 *   { success: true, url: "https://..." }
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { bucket, region, accessKeyId, secretAccessKey, folder, linkType, expiresIn } = req.body;

    // --- Validation ---
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided. Use field name "file".' });
    }
    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bucket, region, accessKeyId, secretAccessKey.'
      });
    }

    // Build the S3 key (path inside the bucket)
    const sanitizedName = req.file.originalname.replace(/[^a-zA-Z0-9._\-]/g, '_');
    const key = folder ? `${folder.replace(/\/$/, '')}/${sanitizedName}` : sanitizedName;

    // --- S3 Client (per-request credentials supplied by the caller) ---
    const s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey }
    });

    // --- Upload ---
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype
      })
    );

    // --- Build return URL ---
    let url;
    const type = (linkType || 'public').toLowerCase();

    if (type === 'presigned') {
      const expiry = parseInt(expiresIn, 10) || 3600;
      url = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        { expiresIn: expiry }
      );
    } else {
      // Public URL — works only if the bucket / object ACL allows public reads
      url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    }

    return res.status(200).json({ success: true, url, key });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
