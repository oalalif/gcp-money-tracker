'use strict'
const {Storage} = require('@google-cloud/storage')
const dateFormat = require('dateformat')
const path = require('path')

const pathKey = path.resolve('./serviceaccountkey.json')

const gcs = new Storage({
    projectId: 'submission-mgce-fatahillah',
    keyFilename: pathKey
})

const bucketName = 'submission-mgce-fatahillah-storage'
const bucket = gcs.bucket(bucketName)

function getPublicUrl(filename) {
    return filename ? `https://storage.googleapis.com/${bucketName}/${filename}` : null;
}

let ImgUpload = {}

ImgUpload.uploadToGcs = (req, res, next) => {
    if (!req || !req.file) {
        return next()
    }

    const gcsname = dateFormat(new Date(), "yyyymmdd-HHMMss")
    const file = bucket.file(gcsname)

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

