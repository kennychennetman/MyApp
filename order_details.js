const sql = require('mssql');
const config = {
    // Your database configuration here
};

async function getOrderDetails(orderId) {
    try {
        await sql.connect(config);

        const result = await sql.query`
            SELECT 
                o.Id AS OrderId, 
                o.CustomerName, 
                o.OrderDate, 
                o.TotalAmount,
                oi.Id AS OrderItemId,
                p.Id AS ProductId,
                p.Name AS ProductName,
                oi.Quantity,
                p.Price
            FROM Orders o
            JOIN OrderItems oi ON o.Id = oi.OrderId
            JOIN Products p ON oi.ProductId = p.Id
            WHERE o.Id = ${orderId}
        `;

        if (result.recordset.length === 0) {
            return { success: false, error: 'Order not found' };
        }

        const orderDetails = {
            orderId: result.recordset[0].OrderId,
            customerName: result.recordset[0].CustomerName,
            orderDate: result.recordset[0].OrderDate,
            totalAmount: result.recordset[0].TotalAmount,
            items: result.recordset.map(item => ({
                orderItemId: item.OrderItemId,
                productId: item.ProductId,
                productName: item.ProductName,
                quantity: item.Quantity,
                price: item.Price
            }))
        };

        return { success: true, orderDetails };
    } catch (error) {
        console.error('Error fetching order details:', error);
        return { success: false, error: error.message };
    } finally {
        await sql.close();
    }
}

module.exports = { getOrderDetails };
