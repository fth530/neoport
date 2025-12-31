/**
 * Swagger API Documentation Configuration
 * OpenAPI 3.0 Specification
 */

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Portfolio Tracker API',
            version: '1.2.0',
            description: 'Yatırım portföy takip uygulaması REST API dokümantasyonu',
            contact: {
                name: 'API Support',
                email: 'support@portfolio-app.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            },
            {
                url: 'https://api.portfolio-app.com',
                description: 'Production server'
            }
        ],
        tags: [
            {
                name: 'Assets',
                description: 'Varlık yönetimi endpoints'
            },
            {
                name: 'Transactions',
                description: 'İşlem yönetimi endpoints'
            },
            {
                name: 'Export/Import',
                description: 'Veri export/import endpoints'
            },
            {
                name: 'Reports',
                description: 'Raporlama ve analiz endpoints'
            },
            {
                name: 'Integrity',
                description: 'Veri bütünlüğü endpoints'
            },
            {
                name: 'System',
                description: 'Sistem ve monitoring endpoints'
            }
        ],
        components: {
            schemas: {
                Asset: {
                    type: 'object',
                    required: ['name', 'symbol', 'type'],
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'Varlık ID',
                            example: 1
                        },
                        name: {
                            type: 'string',
                            description: 'Varlık adı',
                            example: 'Bitcoin'
                        },
                        symbol: {
                            type: 'string',
                            description: 'Varlık sembolü',
                            example: 'BTC'
                        },
                        type: {
                            type: 'string',
                            enum: ['crypto', 'stock', 'gold', 'currency'],
                            description: 'Varlık tipi',
                            example: 'crypto'
                        },
                        quantity: {
                            type: 'number',
                            description: 'Miktar',
                            example: 0.5
                        },
                        avg_cost: {
                            type: 'number',
                            description: 'Ortalama maliyet',
                            example: 50000
                        },
                        current_price: {
                            type: 'number',
                            description: 'Güncel fiyat',
                            example: 55000
                        },
                        currency: {
                            type: 'string',
                            description: 'Para birimi',
                            example: 'USD'
                        },
                        icon: {
                            type: 'string',
                            description: 'Font Awesome icon class',
                            example: 'fa-bitcoin'
                        },
                        icon_bg: {
                            type: 'string',
                            description: 'Icon background color',
                            example: 'orange'
                        },
                        current_value: {
                            type: 'number',
                            description: 'Güncel değer (quantity * current_price)',
                            example: 27500
                        },
                        profit_loss: {
                            type: 'number',
                            description: 'Kar/Zarar (TL)',
                            example: 2500
                        },
                        profit_loss_percent: {
                            type: 'number',
                            description: 'Kar/Zarar (%)',
                            example: 10
                        }
                    }
                },
                Transaction: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'integer',
                            description: 'İşlem ID',
                            example: 1
                        },
                        asset_id: {
                            type: 'integer',
                            description: 'Varlık ID',
                            example: 1
                        },
                        asset_name: {
                            type: 'string',
                            description: 'Varlık adı',
                            example: 'Bitcoin'
                        },
                        type: {
                            type: 'string',
                            enum: ['buy', 'sell'],
                            description: 'İşlem tipi',
                            example: 'buy'
                        },
                        quantity: {
                            type: 'number',
                            description: 'Miktar',
                            example: 0.1
                        },
                        price: {
                            type: 'number',
                            description: 'İşlem fiyatı',
                            example: 52000
                        },
                        total: {
                            type: 'number',
                            description: 'Toplam tutar',
                            example: 5200
                        },
                        realized_profit: {
                            type: 'number',
                            description: 'Gerçekleşen kar/zarar (sadece satışta)',
                            example: 200
                        },
                        date: {
                            type: 'string',
                            format: 'date-time',
                            description: 'İşlem tarihi',
                            example: '2025-12-31T12:00:00.000Z'
                        }
                    }
                },
                Summary: {
                    type: 'object',
                    properties: {
                        total_value: {
                            type: 'number',
                            description: 'Toplam portföy değeri',
                            example: 100000
                        },
                        total_cost: {
                            type: 'number',
                            description: 'Toplam maliyet',
                            example: 90000
                        },
                        total_profit_loss: {
                            type: 'number',
                            description: 'Toplam kar/zarar',
                            example: 10000
                        },
                        total_profit_loss_percent: {
                            type: 'number',
                            description: 'Toplam kar/zarar (%)',
                            example: 11.11
                        },
                        asset_count: {
                            type: 'integer',
                            description: 'Varlık sayısı',
                            example: 5
                        }
                    }
                },
                Error: {
                    type: 'object',
                    properties: {
                        error: {
                            type: 'string',
                            description: 'Hata mesajı',
                            example: 'Varlık bulunamadı'
                        },
                        details: {
                            type: 'string',
                            description: 'Detaylı hata açıklaması',
                            example: 'ID: 999 ile varlık bulunamadı'
                        },
                        timestamp: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Hata zamanı',
                            example: '2025-12-31T12:00:00.000Z'
                        }
                    }
                }
            },
            responses: {
                NotFound: {
                    description: 'Kaynak bulunamadı',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Validasyon hatası',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Sunucu hatası',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ['./server.js', './swagger-docs.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
