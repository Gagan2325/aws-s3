# S3 Upload Microservice

A lightweight Node.js microservice to upload files to any AWS S3 bucket and receive a document link in return.

---

## Prerequisites

- Node.js v18+
- An AWS account with an S3 bucket
- AWS Access Key ID and Secret Access Key with `s3:PutObject` (and optionally `s3:GetObject`) permissions

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Create a .env file for the port
cp .env.example .env

# 3. Start the server
npm start

# OR start with auto-reload (development)
npm run dev
```

The server runs on **http://localhost:3000** by default.  
Change the port by setting `PORT` in your `.env` file.

---

## API Reference

### `POST /api/upload`

Upload a file to S3 and get back its URL.

**Content-Type:** `multipart/form-data`

#### Request Fields

| Field             | Type   | Required | Description                                                     |
|-------------------|--------|----------|-----------------------------------------------------------------|
| `file`            | File   | ✅       | The file to upload                                              |
| `bucket`          | String | ✅       | S3 bucket name (e.g. `my-company-docs`)                        |
| `region`          | String | ✅       | AWS region (e.g. `us-east-1`, `ap-south-1`)                    |
| `accessKeyId`     | String | ✅       | AWS Access Key ID                                               |
| `secretAccessKey` | String | ✅       | AWS Secret Access Key                                           |
| `folder`          | String | ❌       | Subfolder inside the bucket (e.g. `invoices/2026`)             |
| `linkType`        | String | ❌       | `public` (default) or `presigned`                              |
| `expiresIn`       | Number | ❌       | Presigned URL expiry in seconds. Default: `3600` (1 hour)      |

#### Success Response `200`

```json
{
  "success": true,
  "url": "https://my-bucket.s3.us-east-1.amazonaws.com/invoices/2026/report.pdf",
  "key": "invoices/2026/report.pdf"
}
```

#### Error Response `400 / 500`

```json
{
  "success": false,
  "error": "Missing required fields: bucket, region, accessKeyId, secretAccessKey."
}
```

---

## URL Types

### Public URL (`linkType: "public"`)
Returns a permanent direct S3 URL.  
**Requires** the bucket or object to have a public-read policy/ACL enabled in AWS.

```
https://<bucket>.s3.<region>.amazonaws.com/<key>
```

### Presigned URL (`linkType: "presigned"`)
Returns a **temporary signed URL** that grants time-limited access to a private file.  
No public bucket policy needed. Ideal for private documents.

```
https://<bucket>.s3.<region>.amazonaws.com/<key>?X-Amz-Signature=...&X-Amz-Expires=3600
```

---

## Examples

### cURL

```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@/path/to/document.pdf" \
  -F "bucket=my-company-docs" \
  -F "region=us-east-1" \
  -F "accessKeyId=AKIAIOSFODNN7EXAMPLE" \
  -F "secretAccessKey=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" \
  -F "folder=invoices/2026" \
  -F "linkType=presigned" \
  -F "expiresIn=7200"
```

### JavaScript (Fetch API)

```js
const form = new FormData();
form.append('file', fileInput.files[0]);
form.append('bucket', 'my-company-docs');
form.append('region', 'us-east-1');
form.append('accessKeyId', 'AKIAIOSFODNN7EXAMPLE');
form.append('secretAccessKey', 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
form.append('folder', 'invoices/2026');
form.append('linkType', 'presigned');
form.append('expiresIn', '7200');

const res = await fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  body: form
});

const data = await res.json();
console.log(data.url); // https://...
```

### Postman

1. Set method to **POST**, URL to `http://localhost:3000/api/upload`
2. Go to **Body** → select **form-data**
3. Add a key `file`, change its type to **File**, and select your file
4. Add the remaining text keys: `bucket`, `region`, `accessKeyId`, `secretAccessKey`, and any optional fields
5. Click **Send**

---

## Health Check

```
GET /health
```

```json
{ "status": "ok" }
```

---

## AWS IAM Permissions

The AWS credentials you pass must have at minimum:

```json
{
  "Effect": "Allow",
  "Action": [
    "s3:PutObject",
    "s3:GetObject"
  ],
  "Resource": "arn:aws:s3:::your-bucket-name/*"
}
```

`s3:GetObject` is only needed when using `linkType: "presigned"`.

---

## Security Notes

- Never commit real AWS credentials to source control.
- For production, use **IAM Roles** (EC2/ECS) or **environment variables** instead of passing credentials in the request body.
- Use `linkType: "presigned"` for sensitive/private documents.
- Restrict the IAM policy to only the specific bucket and actions needed.
