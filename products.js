const express = require('express');
const router = express.Router();
const sql = require('mssql');

// Your existing SQL configuration
const config = {
    user: 'SA',
    password: '1qaz@WSX',
    server: '192.168.100.164',
    database: 'POS_DB',
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    port: 31443
};

// Your existing route handlers
router.get('/', async (req, res) => {
    try {
        await sql.connect(config);
        const result = await sql.query('SELECT ID, Name, Price, Stock FROM Products WHERE Stock > 0');
        console.log('Sending products:', JSON.stringify(result.recordset, null, 2));
        res.json(result.recordset);
    } catch (err) {
        console.error('Error in GET /products:', err);
        res.status(500).send('Server error');
    } finally {
        await sql.close();
    }
});

router.post('/', async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        await sql.connect(config);
        const result = await sql.query`INSERT INTO Products (Name, Price, Stock) VALUES (${name}, ${price}, ${stock})`;
        res.status(201).json({ message: 'Product added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    } finally {
        await sql.close();
    }
});

// Export the router and config
module.exports = { router, config };
