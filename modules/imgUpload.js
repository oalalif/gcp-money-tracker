'use strict'
const {Storage} = require('@google-cloud/storage')
const fs = require('fs')
const dateFormat = require('dateformat')
const path = require('path');

const pathKey = path.resolve('./serviceaccountkey.json')

// Konfigurasi Storage dengan kredensial dan project ID
const gcs = new Storage({
    projectId: 'submission-mgce-fatahillah',
    keyFilename: pathKey
})

// Nama bucket yang digunakan
const bucketName = 'submission-mgce-fatahillah-storage'
const bucket = gcs.bucket(bucketName)

// Fungsi untuk membuat URL publik berdasarkan nama file
function getPublicUrl(filename) {
    return 'https://storage.googleapis.com/' + bucketName + '/' + filename;
}

let ImgUpload = {}

ImgUpload.uploadToGcs = (req, res, next) => {
    if (!req.file) return next()

    // Tambahkan ekstensi .jpeg ke nama file yang telah diformat tanggalnya
    const timestamp = dateFormat(new Date(), "yyyymmdd-HHMMss")
    const gcsname = `${timestamp}.jpeg`
    const file = bucket.file(gcsname)

    // Membuat stream untuk menulis file ke Google Cloud Storage
    const stream = file.createWriteStream({
        metadata: {
            contentType: req.file.mimetype
        }
    })

    stream.on('error', (err) => {
        req.file.cloudStorageError = err
        next(err)
    })

    stream.on('finish', () => {
        req.file.cloudStorageObject = gcsname
        req.file.cloudStoragePublicUrl = getPublicUrl(gcsname)
        next()
    })

    stream.end(req.file.buffer)
}

module.exports = ImgUpload