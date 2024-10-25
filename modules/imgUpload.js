'use strict'
const {Storage} = require('@google-cloud/storage')
const fs = require('fs')
const dateFormat = require('dateformat')
const path = require('path')
const mime = require('mime-types') // Tambahkan package ini untuk deteksi MIME type

const pathKey = path.resolve('./serviceaccountkey.json')

// Google Cloud Storage configuration
const gcs = new Storage({
    projectId: 'submission-mgce-fatahillah',
    keyFilename: pathKey
})

const bucketName = 'submission-mgce-fatahillah-storage'
const bucket = gcs.bucket(bucketName)

// Konfigurasi untuk file yang diizinkan
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']

function getPublicUrl(filename) {
    return `https://storage.googleapis.com/${bucketName}/${filename}`
}

// Helper untuk memvalidasi tipe file
function validateFileType(file) {
    const extension = path.extname(file.originalname).toLowerCase()
    let contentType = file.mimetype

    // Jika mimetype adalah application/octet-stream, coba deteksi dari ekstensi
    if (contentType === 'application/octet-stream') {
        contentType = mime.lookup(extension) || file.mimetype
    }

    // Validasi ekstensi dan mimetype
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        throw new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
    }

    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
        throw new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`)
    }

    return contentType
}

// Helper untuk generate nama file unik
function generateUniqueFileName(originalName) {
    const timestamp = dateFormat(new Date(), "yyyymmdd-HHMMss")
    const extension = path.extname(originalName)
    const sanitizedName = path.basename(originalName, extension)
        .replace(/[^a-z0-9]/gi, '-')
        .toLowerCase()
    return `${timestamp}-${sanitizedName}${extension}`
}

// Helper untuk update content type jika diperlukan
async function updateContentType(file, contentType) {
    try {
        await file.setMetadata({
            contentType: contentType
        })
        console.log(`Content-Type updated for ${file.name} to ${contentType}`)
    } catch (error) {
        console.error('Error updating content-type:', error)
        throw error
    }
}

const ImgUpload = {
    uploadToGcs: (req, res, next) => {
        if (!req.file) {
            console.log('No file uploaded')
            return next()
        }

        try {
            // Validate file type and get proper content type
            const contentType = validateFileType(req.file)
            console.log('Detected content type:', contentType)

            // Generate unique filename
            const gcsname = generateUniqueFileName(req.file.originalname)
            const file = bucket.file(gcsname)

            // Set up file stream with metadata
            const stream = file.createWriteStream({
                metadata: {
                    contentType: contentType,
                    metadata: {
                        originalName: req.file.originalname,
                        originalMimetype: req.file.mimetype,
                        detectedMimetype: contentType,
                        uploadedAt: new Date().toISOString()
                    }
                },
                resumable: false
            })

            // Error handling for stream
            stream.on('error', (err) => {
                console.error('Error uploading to GCS:', {
                    error: err.message,
                    stack: err.stack,
                    fileName: gcsname,
                    contentType: contentType
                })
                req.file.cloudStorageError = err
                next(err)
            })

            // Success handling
            stream.on('finish', async () => {
                try {
                    // Verify and update content type if needed
                    const [metadata] = await file.getMetadata()
                    if (metadata.contentType !== contentType) {
                        await updateContentType(file, contentType)
                    }

                    // Make file public
                    await file.makePublic()
                    
                    // Set file information in request object
                    req.file.cloudStorageObject = gcsname
                    req.file.cloudStoragePublicUrl = getPublicUrl(gcsname)
                    req.file.cloudStorageMetadata = metadata
                    req.file.detectedContentType = contentType
                    
                    console.log('File uploaded successfully:', {
                        fileName: gcsname,
                        publicUrl: req.file.cloudStoragePublicUrl,
                        contentType: contentType
                    })
                    
                    next()
                } catch (err) {
                    console.error('Error in post-upload processing:', {
                        error: err.message,
                        stack: err.stack,
                        fileName: gcsname,
                        contentType: contentType
                    })
                    next(err)
                }
            })

            // Handle stream completion
            stream.end(req.file.buffer)
        } catch (err) {
            console.error('Error initializing upload:', {
                error: err.message,
                stack: err.stack,
                originalMimetype: req.file.mimetype
            })
            next(err)
        }
    }
}

module.exports = ImgUpload