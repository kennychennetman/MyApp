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

        // Check if the product already exists
        const checkResult = await sql.query`SELECT ID FROM Products WHERE Name = ${name}`;
        
        if (checkResult.recordset.length > 0) {
            // Update existing product
            await sql.query`UPDATE Products SET Price = ${price}, Stock = ${stock} WHERE Name = ${name}`;
            res.json({ message: 'Product updated successfully' });
        } else {
            // Insert new product
            await sql.query`INSERT INTO Products (Name, Price, Stock) VALUES (${name}, ${price}, ${stock})`;
            res.status(201).json({ message: 'Product added successfully' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    } finally {
        await sql.close();
    }
});

// Add this new route handler for fetching a product by name
router.get('/name', async (req, res) => {
    try {
        const productName = req.query.name;
        if (!productName) {
            return res.status(400).json({ error: 'Product name is required' });
        }

        await sql.connect(config);
        const result = await sql.query`
            SELECT ID, Name, Price, Stock 
            FROM Products 
            WHERE LOWER(Name) = LOWER(${productName})
        `;

        if (result.recordset.length > 0) {
            console.log('Sending product:', JSON.stringify(result.recordset[0], null, 2));
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: 'Product not found' });
        }
    } catch (err) {
        console.error('Error in GET /product/name:', err);
        res.status(500).send('Server error');
    } finally {
        await sql.close();
    }
});

// Updated route handler for removing a product by name
router.post('/remove-product', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, error: 'Product name is required' });
        }

        await sql.connect(config);

        // First, check if the product is referenced in OrderItems
        const checkResult = await sql.query`
            SELECT TOP 1 1
            FROM OrderItems oi
            INNER JOIN Products p ON oi.ProductId = p.ID
            WHERE p.Name = ${name}
        `;

        if (checkResult.recordset.length > 0) {
            // Product is referenced in orders, can't delete
            return res.status(400).json({ 
                success: false, 
                error: 'This product cannot be deleted because it is associated with one or more orders.' 
            });
        }

        // If not referenced, proceed with deletion
        const result = await sql.query`DELETE FROM Products WHERE Name = ${name}`;
        if (result.rowsAffected[0] > 0) {
            res.json({ success: true, message: 'Product removed successfully' });
        } else {
            res.status(404).json({ success: false, error: 'Product not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: 'Server error' });
    } finally {
        await sql.close();
    }
});

// Export the router and config
module.exports = { router, config };
