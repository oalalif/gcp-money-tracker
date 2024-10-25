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

// Fungsi untuk membuat URL publik berdasarkan nama file
function getPublicUrl(filename) {
    return 'https://storage.googleapis.com/' + bucketName + '/' + filename;
}

// Fungsi untuk mengonversi mimetype menjadi ekstensi file
function getFileExtension(mimetype) {
    switch (mimetype) {
        case 'image/jpeg':
            return '.jpeg';
        case 'image/png':
            return '.png';
        case 'image/gif':
            return '.gif';
        default:
            return ''; // Jika format tidak didukung, tanpa ekstensi
    }
}

let ImgUpload = {}

ImgUpload.uploadToGcs = (req, res, next) => {
    if (!req.file) return next()

    // Mendapatkan ekstensi file berdasarkan mimetype
    const fileExtension = getFileExtension(req.file.mimetype)

    // Format nama file menggunakan timestamp ditambah ekstensi file yang sesuai
    const timestamp = dateFormat(new Date(), "yyyymmdd-HHMMss")
    const gcsname = `${timestamp}${fileExtension}`
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
