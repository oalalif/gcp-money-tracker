'use strict';
const { Storage } = require('@google-cloud/storage');
const dateFormat = require('dateformat');
const path = require('path');

// Konfigurasi ke file kunci Google Cloud Service Account
const pathKey = path.resolve('./serviceaccountkey.json');

// Inisialisasi Storage
const gcs = new Storage({
    projectId: 'submission-mgce-fatahillah',
    keyFilename: pathKey
});

const bucketName = 'submission-mgce-fatahillah-storage';
const bucket = gcs.bucket(bucketName);

// Fungsi untuk mendapatkan URL Publik
function getPublicUrl(filename) {
    return 'https://storage.googleapis.com/' + bucketName + '/' + filename;
}

let ImgUpload = {};

// Fungsi untuk upload ke GCS
ImgUpload.uploadToGcs = (req, res, next) => {
    if (!req.file) return next();

    // Cek apakah mimetype file sesuai dengan format gambar yang diizinkan
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).send("File type not supported. Please upload JPEG, PNG, or GIF images.");
    }

    // Membuat nama file dengan ekstensi asli
    const gcsname = dateFormat(new Date(), "yyyymmdd-HHMMss") + path.extname(req.file.originalname);
    const file = bucket.file(gcsname);

    // Membuat stream upload dengan metadata yang mengatur Content-Type
    const stream = file.createWriteStream({
        metadata: {
            contentType: req.file.mimetype, // Menggunakan mimetype asli
        }
    });

    // Menangani error dalam proses stream
    stream.on('error', (err) => {
        req.file.cloudStorageError = err;
        next(err);
    });

    // Menangani selesai upload dan memberikan URL publik
    stream.on('finish', async () => {
        req.file.cloudStorageObject = gcsname;
        req.file.cloudStoragePublicUrl = getPublicUrl(gcsname);

        // Memastikan Content-Type selalu sesuai setelah upload
        await file.setMetadata({
            contentType: req.file.mimetype
        });

        next();
    });

    stream.end(req.file.buffer);
};

// Opsional: Fungsi tambahan untuk memperbarui metadata Content-Type jika diperlukan
async function updateContentType(filename, contentType) {
    const file = bucket.file(filename);
    await file.setMetadata({
        contentType: contentType,
    });
    console.log(`Content-Type untuk ${filename} diperbarui menjadi ${contentType}`);
}

module.exports = ImgUpload;