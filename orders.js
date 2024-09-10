const express = require('express');
const router = express.Router();
const sql = require('mssql');
const { config } = require('./products');

router.post('/', async (req, res) => {
    console.log('Received order:', JSON.stringify(req.body, null, 2));
    let connection;
    try {
        const { customerName, items } = req.body;
        connection = await sql.connect(config);
        
        // Start a transaction
        const transaction = new sql.Transaction(connection);
        await transaction.begin();

        try {
            let totalAmount = 0;
            const orderItems = [];

            // Calculate total amount, get product details, and update stock
            for (const item of items) {
                const productResult = await transaction.request()
                    .input('productId', sql.Int, item.productId)
                    .query('SELECT Name, Price, Stock FROM Products WHERE ID = @productId');

                console.log('Product query result:', productResult.recordset);

                if (productResult.recordset.length === 0) {
                    throw new Error(`Product with ID ${item.productId} not found`);
                }

                const product = productResult.recordset[0];
                
                if (product.Stock < item.quantity) {
                    throw new Error(`Insufficient stock for product ${product.Name}`);
                }

                const itemTotal = product.Price * item.quantity;
                totalAmount += itemTotal;

                // Update product stock
                await transaction.request()
                    .input('productId', sql.Int, item.productId)
                    .input('quantity', sql.Int, item.quantity)
                    .query('UPDATE Products SET Stock = Stock - @quantity WHERE ID = @productId');

                orderItems.push({
                    productId: item.productId,
                    productName: product.Name,
                    quantity: item.quantity,
                    price: product.Price
                });
            }

            // Insert into Orders table with current date and total amount
            const orderResult = await transaction.request()
                .input('customerName', sql.NVarChar, customerName)
                .input('orderDate', sql.DateTime, new Date())
                .input('totalAmount', sql.Decimal(10, 2), totalAmount)
                .query('INSERT INTO Orders (CustomerName, OrderDate, TotalAmount) OUTPUT INSERTED.ID VALUES (@customerName, @orderDate, @totalAmount)');
            
            const orderId = orderResult.recordset[0].ID;
            console.log('Created order with ID:', orderId);

            // Insert order items
            for (const item of orderItems) {
                await transaction.request()
                    .input('orderId', sql.Int, orderId)
                    .input('productId', sql.Int, item.productId)
                    .input('quantity', sql.Int, item.quantity)
                    .query('INSERT INTO OrderItems (OrderId, ProductId, Quantity) VALUES (@orderId, @productId, @quantity)');
            }

            // Commit the transaction
            await transaction.commit();

            const responseData = {
                id: orderId,
                customerName: customerName,
                totalAmount: totalAmount,
                items: orderItems
            };
            console.log('Sending response:', JSON.stringify(responseData, null, 2));

            // Make sure to send the orderId in the response
            res.status(201).json({
                message: 'Order created successfully',
                orderId: orderId, // Make sure this is the correct variable name for your order ID
                totalAmount: totalAmount,
                items: orderItems
            });
        } catch (err) {
            // If there's an error, roll back the transaction
            await transaction.rollback();
            throw err;
        }
    } catch (err) {
        console.error('Error processing order:', err);
        res.status(500).json({ error: 'An error occurred while processing the order.', details: err.message });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

router.get('/:id', async (req, res) => {
    console.log(`Fetching order details for ID: ${req.params.id}`);
    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT o.ID, o.CustomerName, o.OrderDate, o.TotalAmount,
                   oi.ProductId, oi.Quantity, p.Name as ProductName, p.Price
            FROM Orders o
            JOIN OrderItems oi ON o.ID = oi.OrderId
            JOIN Products p ON oi.ProductId = p.ID
            WHERE o.ID = ${req.params.id}
        `;
        console.log('Query result:', JSON.stringify(result.recordset, null, 2));
        
        if (result.recordset.length === 0) {
            console.log(`No order found for ID: ${req.params.id}`);
            return res.status(404).json({ error: 'Order not found' });
        }
        
        // Process the result to group items under the order
        const order = {
            id: result.recordset[0].ID,
            customerName: result.recordset[0].CustomerName,
            orderDate: result.recordset[0].OrderDate,
            totalAmount: result.recordset[0].TotalAmount,
            items: result.recordset.map(item => ({
                productId: item.ProductId,
                productName: item.ProductName,
                quantity: item.Quantity,
                price: item.Price
            }))
        };
        
        console.log('Sending order details:', JSON.stringify(order, null, 2));
        res.json(order);
    } catch (err) {
        console.error('Error fetching order:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    } finally {
        await sql.close();
    }
});

module.exports = router;