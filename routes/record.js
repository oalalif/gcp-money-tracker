const express = require('express')
const mysql = require('mysql')
const router = express.Router()
const Multer = require('multer')
const imgUpload = require('../modules/imgUpload')
const path = require('path')

// Konfigurasi validasi file
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

// Konfigurasi Multer dengan validasi
const multer = Multer({
    storage: Multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Validasi mime type
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false)
        }
        cb(null, true)
    },
    limits: {
        fileSize: MAX_FILE_SIZE
    }
})

// Error handler untuk multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof Multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
            })
        }
    }
    if (err.message.includes('Invalid file type')) {
        return res.status(400).json({
            message: err.message
        })
    }
    next(err)
}

// TODO: Sesuaikan konfigurasi database
const connection = mysql.createConnection({
    host: '34.128.69.255',
    user: 'root',
    database: 'money-db',
    password: '12345678'
})

// Wrap database queries in promises untuk better error handling
const query = (sql, params) => {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, (err, results) => {
            if (err) reject(err)
            else resolve(results)
        })
    })
}

router.get("/dashboard", async (req, res) => {
    try {
        const sql = `
            SELECT 
                (SELECT COUNT(*) FROM records 
                 WHERE MONTH(records.date) = MONTH(NOW()) 
                 AND YEAR(records.date) = YEAR(NOW())) as month_records,
                (SELECT SUM(amount) FROM records) as total_amount
        `
        const rows = await query(sql)
        res.json(rows)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.get("/getrecords", async (req, res) => {
    try {
        const rows = await query("SELECT * FROM records")
        res.json(rows)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.get("/getlast10records", async (req, res) => {
    try {
        const rows = await query("SELECT * FROM records ORDER BY date DESC LIMIT 10")
        res.json(rows)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.get("/gettopexpense", async (req, res) => {
    try {
        const rows = await query("SELECT * FROM records WHERE amount < 0 ORDER BY amount ASC LIMIT 10")
        res.json(rows)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.get("/getrecord/:id", async (req, res) => {
    try {
        const rows = await query("SELECT * FROM records WHERE id = ?", [req.params.id])
        if (rows.length === 0) {
            return res.status(404).json({message: "Record not found"})
        }
        res.json(rows[0])
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.get("/searchrecords", async (req, res) => {
    try {
        const searchTerm = req.query.s
        // Menggunakan parameterized query untuk mencegah SQL injection
        const rows = await query(
            "SELECT * FROM records WHERE name LIKE ? OR notes LIKE ?",
            [`%${searchTerm}%`, `%${searchTerm}%`]
        )
        res.json(rows)
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.post("/insertrecord", 
    multer.single('attachment'), 
    handleMulterError,
    imgUpload.uploadToGcs, 
    async (req, res) => {
        try {
            const { name, amount, date, notes } = req.body
            let imageUrl = ''

            if (req.file && req.file.cloudStoragePublicUrl) {
                imageUrl = req.file.cloudStoragePublicUrl
            }

            // Validasi input
            if (!name || !amount || !date) {
                return res.status(400).json({
                    message: "Name, amount, and date are required"
                })
            }

            await query(
                "INSERT INTO records (name, amount, date, notes, attachment) VALUES (?, ?, ?, ?, ?)",
                [name, amount, date, notes, imageUrl]
            )

            res.status(201).json({
                message: "Record inserted successfully",
                data: { name, amount, date, notes, imageUrl }
            })
        } catch (err) {
            res.status(500).json({message: err.message})
        }
    }
)

router.put("/editrecord/:id", 
    multer.single('attachment'), 
    handleMulterError,
    imgUpload.uploadToGcs, 
    async (req, res) => {
        try {
            const { id } = req.params
            const { name, amount, date, notes } = req.body
            let imageUrl = ''

            // Check if record exists
            const existingRecord = await query("SELECT * FROM records WHERE id = ?", [id])
            if (existingRecord.length === 0) {
                return res.status(404).json({message: "Record not found"})
            }

            if (req.file && req.file.cloudStoragePublicUrl) {
                imageUrl = req.file.cloudStoragePublicUrl
            } else {
                // Keep existing image if no new image uploaded
                imageUrl = existingRecord[0].attachment
            }

            await query(
                "UPDATE records SET name = ?, amount = ?, date = ?, notes = ?, attachment = ? WHERE id = ?",
                [name, amount, date, notes, imageUrl, id]
            )

            res.json({
                message: "Record updated successfully",
                data: { id, name, amount, date, notes, imageUrl }
            })
        } catch (err) {
            res.status(500).json({message: err.message})
        }
    }
)

router.delete("/deleterecord/:id", async (req, res) => {
    try {
        const { id } = req.params
        
        // Check if record exists before deleting
        const record = await query("SELECT * FROM records WHERE id = ?", [id])
        if (record.length === 0) {
            return res.status(404).json({message: "Record not found"})
        }

        await query("DELETE FROM records WHERE id = ?", [id])
        
        res.json({
            message: "Record deleted successfully",
            data: { id }
        })
    } catch (err) {
        res.status(500).json({message: err.message})
    }
})

router.post("/uploadImage",
    multer.single('image'),
    handleMulterError,
    imgUpload.uploadToGcs,
    (req, res) => {
        try {
            const data = req.body
            if (req.file && req.file.cloudStoragePublicUrl) {
                data.imageUrl = req.file.cloudStoragePublicUrl
                data.contentType = req.file.detectedContentType // dari imgUpload yang sudah diupdate
            }
            res.json(data)
        } catch (err) {
            res.status(500).json({message: err.message})
        }
    }
)

module.exports = router