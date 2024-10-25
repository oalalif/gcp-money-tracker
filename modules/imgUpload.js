'use strict'
const {Storage} = require('@google-cloud/storage')
const fs = require('fs')
const dateFormat = require('dateformat')
const path = require('path');
const pathKey = path.resolve('./serviceaccountkey.json')

// Konfigurasi Google Cloud Storage
const gcs = new Storage({
    projectId: 'submission-mgce-fatahillah',
    keyFilename: pathKey
})

// Nama bucket yang digunakan
const bucketName = 'submission-mgce-fatahillah-storage'
const bucket = gcs.bucket(bucketName)

function getPublicUrl(filename) {
    return 'https://storage.googleapis.com/' + bucketName + '/' + filename;
}

let ImgUpload = {}

ImgUpload.uploadToGcs = (req, res, next) => {
    if (!req.file) return next()

    // Validasi tipe file
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
        const error = new Error('Invalid file type')
        error.status = 400
        return next(error)
    }

    // Set nama file berdasarkan tanggal
    const gcsname = dateFormat(new Date(), "yyyymmdd-HHMMss") + path.extname(req.file.originalname)
    const file = bucket.file(gcsname)

    const stream = file.createWriteStream({
        metadata: {
            contentType: req.file.mimetype || 'application/octet-stream' // Menetapkan contentType secara manual
        }
    })

    // Event handling untuk stream
    stream.on('error', (err) => {
        req.file.cloudStorageError = err
        next(err)
    })

    stream.on('finish', async () => {
        req.file.cloudStorageObject = gcsname
        req.file.cloudStoragePublicUrl = getPublicUrl(gcsname)
        
        // Memastikan kembali `Content-Type` di Google Cloud Bucket
        try {
            await file.setMetadata({
                contentType: req.file.mimetype || 'image/jpeg' // Set default jika `mimetype` kosong
            })
        } catch (err) {
            console.error('Error setting metadata:', err)
        }

        next()
    })

    stream.end(req.file.buffer)
}

module.exports = ImgUpload
