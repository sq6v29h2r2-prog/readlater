// middlewares/validate.js - Joi validation middleware

const Joi = require('joi');

/**
 * Joi schema ile request body doğrulama middleware'i
 * @param {Joi.Schema} schema - Joi şeması
 * @returns {Function} Express middleware
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Tüm hataları göster
            stripUnknown: true // Bilinmeyen alanları kaldır
        });

        if (error) {
            const messages = error.details.map(d => d.message).join(', ');
            return res.status(400).json({
                success: false,
                error: messages
            });
        }

        // Doğrulanmış değerleri req.body'ye ata
        req.body = value;
        next();
    };
}

// Yaygın kullanılan şemalar
const schemas = {
    saveUrl: Joi.object({
        url: Joi.string().uri().required().messages({
            'string.uri': 'Geçerli bir URL giriniz',
            'any.required': 'URL gerekli'
        })
    }),

    saveWithContent: Joi.object({
        url: Joi.string().uri().required().messages({
            'string.uri': 'Geçerli bir URL giriniz',
            'any.required': 'URL gerekli'
        }),
        html: Joi.string().min(100).required().messages({
            'string.min': 'HTML içeriği çok kısa',
            'any.required': 'HTML içeriği gerekli'
        })
    }),

    highlight: Joi.object({
        text: Joi.string().min(1).max(5000).required().messages({
            'string.min': 'Highlight metni boş olamaz',
            'string.max': 'Highlight metni çok uzun',
            'any.required': 'Highlight metni gerekli'
        }),
        color: Joi.string().valid('yellow', 'green', 'blue', 'pink').optional()
    }),

    notes: Joi.object({
        notes: Joi.string().allow('').max(50000).messages({
            'string.max': 'Not çok uzun'
        })
    }),

    idParam: Joi.object({
        id: Joi.number().integer().positive().required()
    }),

    restore: Joi.object({
        mode: Joi.string().valid('merge', 'replace').default('merge').messages({
            'any.only': 'Mode "merge" veya "replace" olmalı'
        }),
        backup: Joi.object({
            version: Joi.string().required(),
            exportedAt: Joi.string().required(),
            data: Joi.object({
                articles: Joi.array().required(),
                highlights: Joi.array().required()
            }).required()
        }).required().messages({
            'any.required': 'Yedek verisi gerekli'
        })
    })
};

module.exports = { validate, schemas };
